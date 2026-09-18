import type { Actor } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  graphIdSchema,
  relationshipInputSchema,
  relationshipReviewSchema,
  type RelationshipDetail,
  type RelationshipInput,
  type RelationshipReview,
} from "@/domain/graph";
import { EvidenceConfidence, VerificationState } from "@/domain/model";
import { assertCan } from "@/server/authorization/policy";
import type { GraphRepository } from "@/server/graph/graph-repository";
import { PrismaGraphRepository } from "@/server/graph/prisma-graph-repository";

function parseRelationshipInput(input: RelationshipInput): RelationshipInput {
  const parsed = relationshipInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
  return parsed.data;
}

export class RelationshipService {
  constructor(private readonly repository: GraphRepository) {}

  async proposeRelationship(actor: Actor, input: RelationshipInput): Promise<RelationshipDetail> {
    assertCan(actor, "RELATIONSHIP_SUGGEST");
    const parsed = parseRelationshipInput(input);
    if (parsed.evidenceConfidence === EvidenceConfidence.Verified) {
      throw new ValidationError("Only an Administrator can mark evidence confidence as verified.");
    }
    return this.repository.createRelationship(actor, parsed, {
      verificationState: VerificationState.Pending,
      verifiedById: null,
      verifiedAt: null,
      auditAction: "RELATIONSHIP_PROPOSE",
    });
  }

  async createVerifiedRelationship(
    actor: Actor,
    input: RelationshipInput,
  ): Promise<RelationshipDetail> {
    assertCan(actor, "RELATIONSHIP_VERIFY");
    const parsed = parseRelationshipInput(input);
    if (parsed.sources.length === 0) {
      throw new ValidationError("Verified relationships require at least one provenance source.");
    }
    return this.repository.createRelationship(actor, parsed, {
      verificationState: VerificationState.Verified,
      verifiedById: actor.userId,
      verifiedAt: new Date(),
      auditAction: "RELATIONSHIP_CREATE_VERIFIED",
    });
  }

  async reviewRelationship(
    actor: Actor,
    relationshipId: string,
    review: RelationshipReview,
  ): Promise<RelationshipDetail> {
    assertCan(actor, "RELATIONSHIP_VERIFY");
    if (!graphIdSchema.safeParse(relationshipId).success) throw new NotFoundError();
    const parsed = relationshipReviewSchema.safeParse(review);
    if (!parsed.success) throw new ValidationError("The relationship review decision is invalid.");
    const relationship = await this.repository.reviewRelationship(actor, relationshipId, parsed.data);
    if (!relationship) throw new NotFoundError();
    return relationship;
  }
}

const relationshipService = new RelationshipService(new PrismaGraphRepository());

export const proposeRelationship = relationshipService.proposeRelationship.bind(relationshipService);
export const createVerifiedRelationship = relationshipService.createVerifiedRelationship.bind(relationshipService);
export const reviewRelationship = relationshipService.reviewRelationship.bind(relationshipService);
