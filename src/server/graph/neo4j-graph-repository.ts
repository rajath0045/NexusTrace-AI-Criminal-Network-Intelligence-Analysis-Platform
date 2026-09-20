import type { Node, Relationship } from "neo4j-driver";
import type { Actor } from "@/domain/auth";
import type { GraphEdgeView, GraphEntityView, GraphFilters, GraphNeighborhood, RelationshipDetail, RelationshipInput, RelationshipPersistenceState, RelationshipReview } from "@/domain/graph";
import { EvidenceConfidence, GraphEntityType, RelationshipStrength, UserRole, VerificationState } from "@/domain/model";
import { getNeo4jDriver, Neo4jUnavailableError } from "./neo4j-client";
import type { GraphRepository } from "./graph-repository";

function asEntity(node: Node): GraphEntityView {
  const value = node.properties as Record<string, unknown>;
  return {
    id: String(value.postgresId), entityType: value.entityType as GraphEntityType,
    displayLabel: String(value.displayLabel), verificationState: value.verificationState as VerificationState,
    canonicalRecord: value.canonicalRecordId && value.canonicalRecordType
      ? { id: String(value.canonicalRecordId), type: value.canonicalRecordType as "PERSON" | "CASE" | "INCIDENT" }
      : null,
  };
}

function asEdge(relationship: Relationship): GraphEdgeView {
  const value = relationship.properties as Record<string, unknown>;
  return {
    id: String(value.relationshipId), sourceId: String(value.sourcePostgresId), targetId: String(value.targetPostgresId),
    relationshipType: String(value.semanticType), strength: value.strength as RelationshipStrength,
    evidenceConfidence: value.evidenceConfidence as EvidenceConfidence, verificationState: value.verificationState as VerificationState,
    interactionCount: Number(value.interactionCount ?? 0), interactionSummary: value.interactionSummary ? String(value.interactionSummary) : null,
    firstObservedAt: value.observedAt ? new Date(String(value.observedAt)) : null,
    latestObservedAt: value.endsAt ? new Date(String(value.endsAt)) : null,
  };
}

/** Server-only Neo4j query adapter. It accepts domain filters, never Cypher from a browser. */
export class Neo4jGraphRepository implements GraphRepository {
  constructor(private readonly canonical: GraphRepository) {}

  findDefaultFocusForActor(actor: Actor) { return this.canonical.findDefaultFocusForActor(actor); }
  findEntityForActor(actor: Actor, entityId: string) { return this.canonical.findEntityForActor(actor, entityId); }
  findRelationshipForActor(actor: Actor, relationshipId: string): Promise<RelationshipDetail | null> { return this.canonical.findRelationshipForActor(actor, relationshipId); }
  createRelationship(actor: Actor, input: RelationshipInput, state: RelationshipPersistenceState) { return this.canonical.createRelationship(actor, input, state); }
  reviewRelationship(actor: Actor, relationshipId: string, review: RelationshipReview) { return this.canonical.reviewRelationship(actor, relationshipId, review); }

  async getNeighborhood(actor: Actor, rootEntityId: string, filters: GraphFilters): Promise<GraphNeighborhood | null> {
    const driver = getNeo4jDriver();
    if (!driver) throw new Neo4jUnavailableError("Neo4j is not configured for relationship intelligence.");
    const session = driver.session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
    const scope = actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId };
    try {
      const root = await session.run(
        `MATCH (focus:GraphEntity {postgresId: $rootId})
         WHERE $departmentId IS NULL OR focus.departmentId = $departmentId
         RETURN focus LIMIT 1`, { rootId: rootEntityId, departmentId: scope.departmentId ?? null },
      );
      if (root.records.length === 0) return null;
      // hops is parsed as 1..3 before this method; it is only interpolated to
      // express Cypher's grammar, never accepted as a query fragment.
      const result = await session.run(
        `MATCH path=(focus:GraphEntity {postgresId: $rootId})-[relationships*1..${filters.hops}]-(neighbor:GraphEntity)
         WHERE ($departmentId IS NULL OR ALL(node IN nodes(path) WHERE node.departmentId = $departmentId))
           AND ALL(rel IN relationships WHERE rel.strength IN $strengths AND rel.verificationState IN $verificationStates)
         UNWIND nodes(path) AS node
         WITH collect(DISTINCT node) AS nodes, collect(DISTINCT relationships) AS relationshipGroups
         UNWIND relationshipGroups AS relationshipGroup
         UNWIND relationshipGroup AS relationship
         RETURN nodes, collect(DISTINCT relationship) AS relationships`,
        { rootId: rootEntityId, departmentId: scope.departmentId ?? null, strengths: filters.strengths, verificationStates: filters.verificationStates },
      );
      const focus = asEntity(root.records[0]!.get("focus") as Node);
      if (result.records.length === 0) return { focusEntity: focus, nodes: [focus], edges: [], activeFilters: filters, provenanceSummaries: [] };
      const record = result.records[0]!;
      const nodes = (record.get("nodes") as Node[]).map(asEntity);
      const edges = (record.get("relationships") as Relationship[]).map(asEdge);
      return {
        focusEntity: focus, nodes: nodes.length ? nodes : [focus], edges, activeFilters: filters,
        provenanceSummaries: edges.map((edge) => ({ relationshipId: edge.id, sourceCount: 0, sourceCaseIds: [] })),
      };
    } catch (error) {
      if (error instanceof Neo4jUnavailableError) throw error;
      throw new Neo4jUnavailableError(error instanceof Error ? error.message : undefined);
    } finally { await session.close(); }
  }
}
