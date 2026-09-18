import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import type {
  GraphEdgeView,
  GraphEntityView,
  GraphFilters,
  GraphNeighborhood,
  GraphSource,
  RelationshipDetail,
  RelationshipInput,
  RelationshipPersistenceState,
  RelationshipReview,
} from "@/domain/graph";
import {
  EvidenceConfidence,
  GraphEntityType,
  RelationshipStrength,
  UserRole,
  VerificationState,
} from "@/domain/model";
import { prisma } from "@/server/db/client";
import { traverseBounded } from "./breadth-first-traversal";
import type { GraphRepository } from "./graph-repository";

const entitySelect = {
  id: true,
  entityType: true,
  displayLabel: true,
  verificationState: true,
  departmentId: true,
  personId: true,
  caseId: true,
  incidentId: true,
} satisfies Prisma.GraphEntitySelect;

const relationshipDetailInclude = {
  sourceEntity: { select: entitySelect },
  targetEntity: { select: entitySelect },
  department: { select: { name: true } },
  createdBy: { select: { displayName: true } },
  verifiedBy: { select: { displayName: true } },
  evidence: {
    include: {
      evidence: {
        select: {
          id: true,
          originalFilename: true,
          verificationState: true,
          departmentId: true,
        },
      },
      sourceCase: {
        select: {
          id: true,
          firNumber: true,
          title: true,
          departmentId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.GraphRelationshipInclude;

type EntityRecord = Prisma.GraphEntityGetPayload<{ select: typeof entitySelect }>;
type RelationshipRecord = Prisma.GraphRelationshipGetPayload<{
  include: typeof relationshipDetailInclude;
}>;

function entityScope(actor: Actor): Prisma.GraphEntityWhereInput {
  return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId };
}

function relationshipScope(actor: Actor): Prisma.GraphRelationshipWhereInput {
  if (actor.role === UserRole.Administrator) return {};
  return {
    departmentId: actor.departmentId,
    sourceEntity: { departmentId: actor.departmentId },
    targetEntity: { departmentId: actor.departmentId },
    evidence: {
      every: {
        evidence: { departmentId: actor.departmentId },
        sourceCase: { departmentId: actor.departmentId },
      },
    },
  };
}

function toEntity(record: EntityRecord): GraphEntityView {
  return {
    id: record.id,
    entityType: record.entityType as GraphEntityType,
    displayLabel: record.displayLabel,
    verificationState: record.verificationState as VerificationState,
    canonicalRecord: record.personId
      ? { type: "PERSON", id: record.personId }
      : record.caseId
        ? { type: "CASE", id: record.caseId }
        : record.incidentId
          ? { type: "INCIDENT", id: record.incidentId }
        : null,
  };
}

function toEdge(record: Pick<RelationshipRecord,
  | "id"
  | "sourceEntityId"
  | "targetEntityId"
  | "relationshipType"
  | "strength"
  | "evidenceConfidence"
  | "verificationState"
  | "interactionCount"
  | "interactionSummary"
  | "startsAt"
  | "endsAt"
>): GraphEdgeView {
  return {
    id: record.id,
    sourceId: record.sourceEntityId,
    targetId: record.targetEntityId,
    relationshipType: record.relationshipType,
    strength: record.strength as RelationshipStrength,
    evidenceConfidence: record.evidenceConfidence as EvidenceConfidence,
    verificationState: record.verificationState as VerificationState,
    interactionCount: record.interactionCount,
    interactionSummary: record.interactionSummary,
    firstObservedAt: record.startsAt,
    latestObservedAt: record.endsAt,
  };
}

function toSource(record: RelationshipRecord["evidence"][number]): GraphSource {
  return {
    id: record.id,
    evidenceId: record.evidence.id,
    evidenceFilename: record.evidence.originalFilename,
    evidenceVerificationState: record.evidence.verificationState as VerificationState,
    sourceCaseId: record.sourceCase.id,
    sourceFirNumber: record.sourceCase.firNumber,
    sourceCaseTitle: record.sourceCase.title,
    note: record.note,
  };
}

function toDetail(record: RelationshipRecord): RelationshipDetail {
  return {
    ...toEdge(record),
    sourceEntity: toEntity(record.sourceEntity),
    targetEntity: toEntity(record.targetEntity),
    departmentName: record.department.name,
    createdByName: record.createdBy.displayName,
    verifiedByName: record.verifiedBy?.displayName ?? null,
    verifiedAt: record.verifiedAt,
    provenance: record.evidence.map(toSource),
  };
}

function assertVerifiedState(state: RelationshipPersistenceState, sourceCount: number): void {
  if (state.verificationState !== VerificationState.Verified) return;
  if (sourceCount < 1 || !state.verifiedById || !state.verifiedAt) {
    throw new ValidationError("Verified relationships require a verifier, timestamp, and provenance.");
  }
}

export class PrismaGraphRepository implements GraphRepository {
  async findDefaultFocusForActor(actor: Actor): Promise<GraphEntityView | null> {
    const relationship = await prisma.graphRelationship.findFirst({
      where: {
        ...relationshipScope(actor),
        strength: RelationshipStrength.Primary,
        verificationState: VerificationState.Verified,
      },
      include: { sourceEntity: { select: entitySelect } },
      orderBy: { id: "asc" },
    });

    if (relationship) return toEntity(relationship.sourceEntity);
    const entity = await prisma.graphEntity.findFirst({
      where: entityScope(actor),
      select: entitySelect,
      orderBy: { id: "asc" },
    });
    return entity ? toEntity(entity) : null;
  }

  async findEntityForActor(actor: Actor, entityId: string): Promise<GraphEntityView | null> {
    const entity = await prisma.graphEntity.findFirst({
      where: { id: entityId, ...entityScope(actor) },
      select: entitySelect,
    });
    return entity ? toEntity(entity) : null;
  }

  async getNeighborhood(
    actor: Actor,
    rootEntityId: string,
    filters: GraphFilters,
  ): Promise<GraphNeighborhood | null> {
    const focusRecord = await prisma.graphEntity.findFirst({
      where: { id: rootEntityId, ...entityScope(actor) },
      select: entitySelect,
    });
    if (!focusRecord) return null;

    type LoadedRelationship = RelationshipRecord & { sourceId: string; targetId: string };
    const traversal = await traverseBounded<LoadedRelationship>(
      rootEntityId,
      filters.hops,
      async (frontier) => {
        const records = await prisma.graphRelationship.findMany({
          where: {
            ...relationshipScope(actor),
            strength: { in: filters.strengths },
            verificationState: { in: filters.verificationStates },
            OR: [
              { sourceEntityId: { in: frontier } },
              { targetEntityId: { in: frontier } },
            ],
          },
          include: relationshipDetailInclude,
          orderBy: { id: "asc" },
          take: 250,
        });
        return records.map((record) => ({
          ...record,
          sourceId: record.sourceEntityId,
          targetId: record.targetEntityId,
        }));
      },
    );

    const nodeMap = new Map<string, GraphEntityView>([[focusRecord.id, toEntity(focusRecord)]]);
    for (const relationship of traversal.edges) {
      nodeMap.set(relationship.sourceEntity.id, toEntity(relationship.sourceEntity));
      nodeMap.set(relationship.targetEntity.id, toEntity(relationship.targetEntity));
    }

    return {
      focusEntity: toEntity(focusRecord),
      nodes: [...nodeMap.values()],
      edges: traversal.edges.map(toEdge),
      activeFilters: filters,
      provenanceSummaries: traversal.edges.map((relationship) => ({
        relationshipId: relationship.id,
        sourceCount: relationship.evidence.length,
        sourceCaseIds: [...new Set(relationship.evidence.map((source) => source.sourceCaseId))],
      })),
    };
  }

  async findRelationshipForActor(
    actor: Actor,
    relationshipId: string,
  ): Promise<RelationshipDetail | null> {
    const relationship = await prisma.graphRelationship.findFirst({
      where: { id: relationshipId, ...relationshipScope(actor) },
      include: relationshipDetailInclude,
    });
    return relationship ? toDetail(relationship) : null;
  }

  async createRelationship(
    actor: Actor,
    input: RelationshipInput,
    state: RelationshipPersistenceState,
  ): Promise<RelationshipDetail> {
    if (input.sourceEntityId === input.targetEntityId) {
      throw new ValidationError("A relationship cannot connect an entity to itself.");
    }
    assertVerifiedState(state, input.sources.length);

    try {
      const relationshipId = await prisma.$transaction(async (transaction) => {
        const [source, target] = await Promise.all([
          transaction.graphEntity.findFirst({
            where: { id: input.sourceEntityId, ...entityScope(actor) },
            select: { id: true, departmentId: true },
          }),
          transaction.graphEntity.findFirst({
            where: { id: input.targetEntityId, ...entityScope(actor) },
            select: { id: true, departmentId: true },
          }),
        ]);
        if (!source || !target) throw new NotFoundError();
        if (source.departmentId !== target.departmentId) {
          throw new ValidationError("Relationship endpoints must belong to the same source department.");
        }

        const evidence = input.sources.length === 0
          ? []
          : await transaction.evidence.findMany({
              where: {
                id: { in: input.sources.map((item) => item.evidenceId) },
                departmentId: source.departmentId,
              },
              select: { id: true, caseId: true },
            });
        const evidenceById = new Map(evidence.map((record) => [record.id, record]));
        if (input.sources.some((item) => evidenceById.get(item.evidenceId)?.caseId !== item.sourceCaseId)) {
          throw new NotFoundError();
        }

        const created = await transaction.graphRelationship.create({
          data: {
            sourceEntityId: input.sourceEntityId,
            targetEntityId: input.targetEntityId,
            relationshipType: input.relationshipType,
            strength: input.strength,
            evidenceConfidence: input.evidenceConfidence,
            verificationState: state.verificationState,
            interactionCount: input.interactionCount,
            interactionSummary: input.interactionSummary ?? null,
            startsAt: input.firstObservedAt ?? null,
            endsAt: input.latestObservedAt ?? null,
            departmentId: source.departmentId,
            createdById: actor.userId,
            verifiedById: state.verifiedById,
            verifiedAt: state.verifiedAt,
            evidence: {
              create: input.sources.map((item) => ({
                evidenceId: item.evidenceId,
                sourceCaseId: item.sourceCaseId,
                note: item.note ?? null,
              })),
            },
          },
          select: { id: true },
        });

        await transaction.auditEvent.create({
          data: {
            actorId: actor.userId,
            departmentId: source.departmentId,
            action: state.auditAction,
            targetType: "GRAPH_RELATIONSHIP",
            targetId: created.id,
            outcome: "SUCCESS",
            metadata: {
              sourceEntityId: input.sourceEntityId,
              targetEntityId: input.targetEntityId,
              relationshipType: input.relationshipType,
              strength: input.strength,
              evidenceConfidence: input.evidenceConfidence,
              sourceCount: input.sources.length,
            },
          },
        });
        return created.id;
      });

      const detail = await this.findRelationshipForActor(actor, relationshipId);
      if (!detail) throw new NotFoundError();
      return detail;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("That directed semantic relationship already exists.");
      }
      throw error;
    }
  }

  async reviewRelationship(
    actor: Actor,
    relationshipId: string,
    review: RelationshipReview,
  ): Promise<RelationshipDetail | null> {
    const reviewed = await prisma.$transaction(async (transaction) => {
      const relationship = await transaction.graphRelationship.findFirst({
        where: { id: relationshipId, ...relationshipScope(actor) },
        include: { _count: { select: { evidence: true } } },
      });
      if (!relationship) return null;
      if (review.decision === VerificationState.Verified && relationship._count.evidence < 1) {
        throw new ValidationError("A relationship cannot be verified without provenance.");
      }

      const isVerified = review.decision === VerificationState.Verified;
      await transaction.graphRelationship.update({
        where: { id: relationship.id },
        data: {
          verificationState: review.decision,
          verifiedById: isVerified ? actor.userId : null,
          verifiedAt: isVerified ? new Date() : null,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: actor.userId,
          departmentId: relationship.departmentId,
          action: `RELATIONSHIP_${review.decision}`,
          targetType: "GRAPH_RELATIONSHIP",
          targetId: relationship.id,
          outcome: "SUCCESS",
          metadata: { previousState: relationship.verificationState },
        },
      });
      return relationship.id;
    });

    return reviewed ? this.findRelationshipForActor(actor, reviewed) : null;
  }
}
