import type { ManagedTransaction } from "neo4j-driver";
import { GraphEntityType } from "@/domain/model";
import { prisma } from "@/server/db/client";
import { getNeo4jDriver, Neo4jUnavailableError } from "./neo4j-client";

const entityLabels: Record<GraphEntityType, string> = {
  [GraphEntityType.Person]: "Person",
  [GraphEntityType.Vehicle]: "Vehicle",
  [GraphEntityType.Property]: "Property",
  [GraphEntityType.Phone]: "Phone",
  [GraphEntityType.Device]: "Device",
  [GraphEntityType.BankAccount]: "FinancialAccount",
  [GraphEntityType.Organization]: "Organization",
  [GraphEntityType.Location]: "Location",
  [GraphEntityType.Case]: "Case",
  [GraphEntityType.Incident]: "Incident",
};

const semanticRelationshipTypes: Record<string, string> = {
  OWNS: "OWNS", LIVES_AT: "LIVES_AT", REGISTERED_AT: "REGISTERED_AT", USES: "USES",
  CALLED: "CALLED", MESSAGED: "MESSAGED", CONTACTED: "CONTACTED", TRANSFERRED_TO: "TRANSFERRED_TO",
  ASSOCIATED_WITH: "ASSOCIATED_WITH", RELATED_TO: "RELATED_TO", INVOLVED_IN: "INVOLVED_IN",
  CONNECTED_TO: "CONNECTED_TO", LOCATED_AT: "LOCATED_AT", EMPLOYED_BY: "EMPLOYED_BY",
  MEMBER_OF: "MEMBER_OF", LINKED_TO_CASE: "LINKED_TO_CASE", LINKED_TO_INCIDENT: "LINKED_TO_INCIDENT",
  SUPPORTED_BY_EVIDENCE: "SUPPORTED_BY_EVIDENCE",
};

export function graphRelationshipType(value: string): string {
  return semanticRelationshipTypes[value] ?? "RELATED_TO";
}

export async function initializeNeo4jSchema(driver = getNeo4jDriver()): Promise<void> {
  if (!driver) throw new Neo4jUnavailableError();
  const session = driver.session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
  try {
    // A universal GraphEntity identity makes every projection deterministic;
    // typed labels are additive query/index conveniences, never public IDs.
    await session.run("CREATE CONSTRAINT graph_entity_postgres_id IF NOT EXISTS FOR (n:GraphEntity) REQUIRE n.postgresId IS UNIQUE");
    await session.run("CREATE INDEX graph_entity_department IF NOT EXISTS FOR (n:GraphEntity) ON (n.departmentId)");
    await session.run("CREATE INDEX graph_entity_type IF NOT EXISTS FOR (n:GraphEntity) ON (n.entityType)");
    // Neo4j relationship-property indexes require one concrete relationship
    // type. This projection intentionally has several semantic types, while
    // deterministic `MERGE` on `relationshipId` prevents duplicates.
  } finally { await session.close(); }
}

async function upsertEntity(tx: ManagedTransaction, entity: {
  id: string; entityType: GraphEntityType; displayLabel: string; verificationState: string; departmentId: string;
  personId: string | null; caseId: string | null; incidentId: string | null; canonicalReference: string | null;
}): Promise<void> {
  const label = entityLabels[entity.entityType];
  await tx.run(
    `MERGE (node:GraphEntity:${label} {postgresId: $postgresId})
     SET node.entityType = $entityType, node.displayLabel = $displayLabel,
         node.verificationState = $verificationState, node.departmentId = $departmentId,
         node.canonicalRecordId = $canonicalRecordId, node.canonicalRecordType = $canonicalRecordType, node.canonicalReference = $canonicalReference,
         node.projectedAt = datetime()`,
    {
      postgresId: entity.id, entityType: entity.entityType, displayLabel: entity.displayLabel,
      verificationState: entity.verificationState, departmentId: entity.departmentId,
      canonicalRecordId: entity.personId ?? entity.caseId ?? entity.incidentId ?? null,
      canonicalRecordType: entity.personId ? "PERSON" : entity.caseId ? "CASE" : entity.incidentId ? "INCIDENT" : null,
      canonicalReference: entity.canonicalReference,
    },
  );
}

async function replaceRelationship(tx: ManagedTransaction, input: {
  id: string; sourceId: string; targetId: string; relationshipType: string; strength: string;
  evidenceConfidence: string; verificationState: string; interactionCount: number; interactionSummary: string | null;
  startsAt: Date | null; endsAt: Date | null; departmentId: string; evidenceIds: string[]; sourceCaseIds: string[];
}): Promise<void> {
  const relationshipType = graphRelationshipType(input.relationshipType);
  // Deleting first is intentional: a corrected semantic type moves the same
  // canonical relationship without leaving a stale parallel relationship.
  await tx.run("MATCH ()-[relationship]->() WHERE relationship.relationshipId = $relationshipId DELETE relationship", { relationshipId: input.id });
  await tx.run(
    `MATCH (source:GraphEntity {postgresId: $sourceId}), (target:GraphEntity {postgresId: $targetId})
     MERGE (source)-[relationship:${relationshipType} {relationshipId: $relationshipId}]->(target)
     SET relationship.semanticType = $semanticType, relationship.strength = $strength,
         relationship.evidenceConfidence = $evidenceConfidence, relationship.verificationState = $verificationState,
         relationship.interactionCount = $interactionCount, relationship.interactionSummary = $interactionSummary,
         relationship.observedAt = $observedAt, relationship.endsAt = $endsAt,
         relationship.departmentId = $departmentId, relationship.sourceType = $sourceType,
         relationship.sourceRecordId = $relationshipId, relationship.sourcePostgresId = $sourceId,
         relationship.targetPostgresId = $targetId, relationship.evidenceIds = $evidenceIds,
         relationship.sourceCaseIds = $sourceCaseIds, relationship.projectedAt = datetime()`,
    {
      relationshipId: input.id, sourceId: input.sourceId, targetId: input.targetId,
      semanticType: input.relationshipType, strength: input.strength, evidenceConfidence: input.evidenceConfidence,
      verificationState: input.verificationState, interactionCount: input.interactionCount,
      interactionSummary: input.interactionSummary, observedAt: input.startsAt?.toISOString() ?? null,
      endsAt: input.endsAt?.toISOString() ?? null, departmentId: input.departmentId,
      sourceType: "GRAPH_RELATIONSHIP", evidenceIds: input.evidenceIds, sourceCaseIds: input.sourceCaseIds,
    },
  );
}

export async function projectCanonicalGraph(driver = getNeo4jDriver()): Promise<{ entities: number; relationships: number }> {
  if (!driver) throw new Neo4jUnavailableError();
  const [entities, relationships, communications, transactions] = await Promise.all([
    prisma.graphEntity.findMany({ select: { id: true, entityType: true, displayLabel: true, verificationState: true, departmentId: true, personId: true, caseId: true, incidentId: true, canonicalReference: true } }),
    prisma.graphRelationship.findMany({ include: { evidence: { select: { evidenceId: true, sourceCaseId: true } } } }),
    prisma.communicationRecord.findMany(),
    prisma.financialTransaction.findMany(),
  ]);
  const session = driver.session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
  try {
    await session.executeWrite(async (tx) => {
      for (const entity of entities) await upsertEntity(tx, { ...entity, entityType: entity.entityType as GraphEntityType });
      for (const relationship of relationships) await replaceRelationship(tx, {
        ...relationship, sourceId: relationship.sourceEntityId, targetId: relationship.targetEntityId,
        startsAt: relationship.startsAt, endsAt: relationship.endsAt,
        evidenceIds: relationship.evidence.map((item) => item.evidenceId),
        sourceCaseIds: relationship.evidence.map((item) => item.sourceCaseId),
      });
      for (const record of communications) await replaceRelationship(tx, {
        id: record.id, sourceId: record.sourceEntityId, targetId: record.destinationEntityId,
        relationshipType: record.communicationType === "CALL" ? "CALLED" : record.communicationType === "MESSAGE" ? "MESSAGED" : "CONTACTED",
        strength: "SECONDARY", evidenceConfidence: record.verificationLevel === "CROSS_VERIFIED" ? "VERIFIED" : "PROBABLE",
        verificationState: record.verificationLevel === "UNVERIFIED" ? "PENDING" : "VERIFIED",
        interactionCount: 1, interactionSummary: record.communicationNumber, startsAt: record.occurredAt, endsAt: record.occurredAt,
        departmentId: record.departmentId, evidenceIds: record.sourceEvidenceId ? [record.sourceEvidenceId] : [], sourceCaseIds: record.caseId ? [record.caseId] : [],
      });
      for (const record of transactions) await replaceRelationship(tx, {
        id: record.id, sourceId: record.sourceEntityId, targetId: record.destinationEntityId,
        relationshipType: "TRANSFERRED_TO", strength: "SECONDARY", evidenceConfidence: record.verificationLevel === "CROSS_VERIFIED" ? "VERIFIED" : "PROBABLE",
        verificationState: record.verificationLevel === "UNVERIFIED" ? "PENDING" : "VERIFIED",
        interactionCount: 1, interactionSummary: `${record.currency} ${record.amount.toString()}`, startsAt: record.occurredAt, endsAt: record.occurredAt,
        departmentId: record.departmentId, evidenceIds: record.sourceEvidenceId ? [record.sourceEvidenceId] : [], sourceCaseIds: record.caseId ? [record.caseId] : [],
      });
    });
    return { entities: entities.length, relationships: relationships.length + communications.length + transactions.length };
  } finally { await session.close(); }
}

export async function rebuildNeo4jProjection(driver = getNeo4jDriver()): Promise<{ entities: number; relationships: number }> {
  if (!driver) throw new Neo4jUnavailableError();
  await initializeNeo4jSchema(driver);
  const session = driver.session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
  try { await session.run("MATCH (node:GraphEntity) DETACH DELETE node"); } finally { await session.close(); }
  return projectCanonicalGraph(driver);
}
