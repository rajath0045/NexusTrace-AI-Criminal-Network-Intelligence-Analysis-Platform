import type { Actor } from "@/domain/auth";
import type {
  GraphEntityView,
  GraphFilters,
  GraphNeighborhood,
  RelationshipDetail,
  RelationshipInput,
  RelationshipPersistenceState,
  RelationshipReview,
} from "@/domain/graph";

export interface GraphRepository {
  findDefaultFocusForActor(actor: Actor): Promise<GraphEntityView | null>;
  findEntityForActor(actor: Actor, entityId: string): Promise<GraphEntityView | null>;
  getNeighborhood(actor: Actor, rootEntityId: string, filters: GraphFilters): Promise<GraphNeighborhood | null>;
  findRelationshipForActor(actor: Actor, relationshipId: string): Promise<RelationshipDetail | null>;
  createRelationship(
    actor: Actor,
    input: RelationshipInput,
    state: RelationshipPersistenceState,
  ): Promise<RelationshipDetail>;
  reviewRelationship(
    actor: Actor,
    relationshipId: string,
    review: RelationshipReview,
  ): Promise<RelationshipDetail | null>;
}
