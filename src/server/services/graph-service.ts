import type { Actor } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  defaultGraphFilters,
  graphIdSchema,
  graphFiltersSchema,
  type GraphEntityView,
  type GraphFilters,
  type GraphNeighborhood,
  type RelationshipDetail,
} from "@/domain/graph";
import { assertCan } from "@/server/authorization/policy";
import type { GraphRepository } from "@/server/graph/graph-repository";
import { PrismaGraphRepository } from "@/server/graph/prisma-graph-repository";
import { Neo4jGraphRepository } from "@/server/graph/neo4j-graph-repository";
import { getNeo4jEnvironment } from "@/server/env";

export class GraphService {
  constructor(private readonly repository: GraphRepository) {}

  async getDefaultFocus(actor: Actor): Promise<GraphEntityView> {
    assertCan(actor, "CASE_VIEW");
    const entity = await this.repository.findDefaultFocusForActor(actor);
    if (!entity) throw new NotFoundError();
    return entity;
  }

  async getEntity(actor: Actor, entityId: string): Promise<GraphEntityView> {
    assertCan(actor, "CASE_VIEW");
    if (!graphIdSchema.safeParse(entityId).success) throw new NotFoundError();
    const entity = await this.repository.findEntityForActor(actor, entityId);
    if (!entity) throw new NotFoundError();
    return entity;
  }

  async getNeighborhood(
    actor: Actor,
    rootEntityId: string,
    filters: Partial<GraphFilters> = {},
  ): Promise<GraphNeighborhood> {
    assertCan(actor, "CASE_VIEW");
    if (!graphIdSchema.safeParse(rootEntityId).success) throw new NotFoundError();
    const parsed = graphFiltersSchema.safeParse({ ...defaultGraphFilters, ...filters });
    if (!parsed.success) throw new ValidationError("The graph filters are invalid.");
    const graph = await this.repository.getNeighborhood(actor, rootEntityId, parsed.data);
    if (!graph) throw new NotFoundError();
    return graph;
  }

  async getRelationshipDetail(actor: Actor, relationshipId: string): Promise<RelationshipDetail> {
    assertCan(actor, "CASE_VIEW");
    if (!graphIdSchema.safeParse(relationshipId).success) throw new NotFoundError();
    const relationship = await this.repository.findRelationshipForActor(actor, relationshipId);
    if (!relationship) throw new NotFoundError();
    return relationship;
  }
}

const canonicalGraphRepository = new PrismaGraphRepository();
// Local/unit environments without NEO4J_* retain the established canonical
// reader. Deployed relationship intelligence uses the projection query engine.
const graphRepository: GraphRepository = getNeo4jEnvironment()
  ? new Neo4jGraphRepository(canonicalGraphRepository)
  : canonicalGraphRepository;
const graphService = new GraphService(graphRepository);

export const getGraphEntity = graphService.getEntity.bind(graphService);
export const getDefaultGraphFocus = graphService.getDefaultFocus.bind(graphService);
export const getNeighborhood = graphService.getNeighborhood.bind(graphService);
export const getRelationshipDetail = graphService.getRelationshipDetail.bind(graphService);
