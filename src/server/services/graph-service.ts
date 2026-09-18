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

export class GraphService {
  constructor(private readonly repository: GraphRepository) {}

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

const graphService = new GraphService(new PrismaGraphRepository());

export const getGraphEntity = graphService.getEntity.bind(graphService);
export const getNeighborhood = graphService.getNeighborhood.bind(graphService);
export const getRelationshipDetail = graphService.getRelationshipDetail.bind(graphService);
