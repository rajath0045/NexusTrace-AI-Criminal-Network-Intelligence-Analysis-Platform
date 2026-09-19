import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type {
  GeographicActivityRecord,
  GeographicFindingSummary,
  LocationObservationInput,
  LocationObservationView,
} from "@/domain/geography";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  FindingReviewStatus,
  GraphEntityType,
  IncidentVerificationLevel,
  LocationObservationType,
  LocationSourceRecordType,
  UserRole,
} from "@/domain/model";
import { temporalPresenceObservationTypes } from "@/domain/geography";
import { prisma } from "@/server/db/client";
import type {
  GeographicActivityQuery,
  GeographicObservationQuery,
  GeographyRepository,
} from "./geography-repository";

const observationInclude = {
  graphEntity: { select: { id: true, entityType: true, displayLabel: true } },
} satisfies Prisma.EntityLocationObservationInclude;

type ObservationRecord = Prisma.EntityLocationObservationGetPayload<{ include: typeof observationInclude }>;

function departmentScope(actor: Actor): { departmentId?: string } {
  return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId };
}

function toObservation(record: ObservationRecord): LocationObservationView {
  return {
    id: record.id,
    graphEntityId: record.graphEntityId,
    entityType: record.graphEntity.entityType as GraphEntityType,
    entityLabel: record.graphEntity.displayLabel,
    latitude: record.latitude.toNumber(),
    longitude: record.longitude.toNumber(),
    observedAt: record.observedAt,
    observationType: record.observationType as LocationObservationType,
    locationLabel: record.locationLabel,
    context: record.context,
    accuracyMeters: record.accuracyMeters,
    sourceRecordType: record.sourceRecordType as LocationSourceRecordType,
    sourceRecordId: record.sourceRecordId,
    sourceEvidenceId: record.sourceEvidenceId,
    verificationLevel: record.verificationLevel as IncidentVerificationLevel,
  };
}

function assertEntityType(type: GraphEntityType, observationType: LocationObservationType): void {
  const allowed: Partial<Record<LocationObservationType, GraphEntityType[]>> = {
    [LocationObservationType.Residence]: [GraphEntityType.Location, GraphEntityType.Property],
    [LocationObservationType.Property]: [GraphEntityType.Property],
    [LocationObservationType.RegisteredAddress]: [GraphEntityType.Location, GraphEntityType.Organization, GraphEntityType.Property],
    [LocationObservationType.ObservedPersonLocation]: [GraphEntityType.Person],
    [LocationObservationType.VehicleObservation]: [GraphEntityType.Vehicle],
    [LocationObservationType.DeviceObservation]: [GraphEntityType.Device, GraphEntityType.Phone],
    [LocationObservationType.IncidentLocation]: [GraphEntityType.Incident],
    [LocationObservationType.EvidenceLocation]: [GraphEntityType.Location],
  };
  if (allowed[observationType] && !allowed[observationType]?.includes(type)) {
    throw new ValidationError(`${observationType.replaceAll("_", " ")} is not valid for a ${type.replaceAll("_", " ")} entity.`);
  }
}

async function sourceExists(
  tx: Prisma.TransactionClient,
  departmentId: string,
  type: LocationSourceRecordType,
  id: string,
): Promise<boolean> {
  if (type === LocationSourceRecordType.Case) return Boolean(await tx.case.findFirst({ where: { id, departmentId }, select: { id: true } }));
  if (type === LocationSourceRecordType.Incident) return Boolean(await tx.incident.findFirst({ where: { id, departmentId }, select: { id: true } }));
  if (type === LocationSourceRecordType.Evidence) return Boolean(await tx.evidence.findFirst({ where: { id, departmentId }, select: { id: true } }));
  if (type === LocationSourceRecordType.Communication) return Boolean(await tx.communicationRecord.findFirst({ where: { id, departmentId }, select: { id: true } }));
  return Boolean(await tx.graphRelationship.findFirst({ where: { id, departmentId }, select: { id: true } }));
}

function timeWhere(startTime?: Date, endTime?: Date): Prisma.DateTimeFilter | undefined {
  if (!startTime && !endTime) return undefined;
  return { ...(startTime ? { gte: startTime } : {}), ...(endTime ? { lte: endTime } : {}) };
}

export class PrismaGeographyRepository implements GeographyRepository {
  async createObservation(actor: Actor, input: LocationObservationInput): Promise<LocationObservationView> {
    const id = await prisma.$transaction(async (tx) => {
      const entity = await tx.graphEntity.findFirst({
        where: { id: input.graphEntityId, ...departmentScope(actor) },
        select: { id: true, departmentId: true, entityType: true },
      });
      if (!entity) throw new NotFoundError();
      assertEntityType(entity.entityType as GraphEntityType, input.observationType);
      if (input.verificationLevel === IncidentVerificationLevel.CrossVerified && actor.role !== UserRole.Administrator) {
        throw new ValidationError("Only an Administrator can add a cross-verified geographic observation.");
      }
      if (!await sourceExists(tx, entity.departmentId, input.sourceRecordType, input.sourceRecordId)) throw new NotFoundError();
      if (input.sourceEvidenceId && !await tx.evidence.findFirst({ where: { id: input.sourceEvidenceId, departmentId: entity.departmentId }, select: { id: true } })) throw new NotFoundError();

      const record = await tx.entityLocationObservation.create({
        data: {
          graphEntityId: input.graphEntityId,
          latitude: new Prisma.Decimal(input.latitude),
          longitude: new Prisma.Decimal(input.longitude),
          observedAt: input.observedAt,
          observationType: input.observationType,
          locationLabel: input.locationLabel,
          context: input.context ?? null,
          accuracyMeters: input.accuracyMeters ?? null,
          sourceRecordType: input.sourceRecordType,
          sourceRecordId: input.sourceRecordId,
          sourceEvidenceId: input.sourceEvidenceId ?? null,
          departmentId: entity.departmentId,
          verificationLevel: input.verificationLevel,
          createdById: actor.userId,
        },
        select: { id: true },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.userId,
          departmentId: entity.departmentId,
          action: "LOCATION_OBSERVATION_CREATE",
          targetType: "ENTITY_LOCATION_OBSERVATION",
          targetId: record.id,
          outcome: "SUCCESS",
          metadata: {
            graphEntityId: input.graphEntityId,
            observationType: input.observationType,
            sourceRecordType: input.sourceRecordType,
            sourceRecordId: input.sourceRecordId,
            verificationLevel: input.verificationLevel,
          },
        },
      });
      return record.id;
    });

    const created = await prisma.entityLocationObservation.findFirst({
      where: { id, ...departmentScope(actor) },
      include: observationInclude,
    });
    if (!created) throw new NotFoundError();
    return toObservation(created);
  }

  async listObservations(actor: Actor, query: GeographicObservationQuery): Promise<LocationObservationView[]> {
    if (query.entityIds.length === 0) return [];
    const observedAt = timeWhere(query.startTime, query.endTime);
    const staticTypes = [LocationObservationType.Residence, LocationObservationType.Property, LocationObservationType.RegisteredAddress];
    const records = await prisma.entityLocationObservation.findMany({
      where: {
        ...departmentScope(actor),
        graphEntityId: { in: query.entityIds },
        graphEntity: departmentScope(actor),
        ...(query.observationTypes ? { observationType: { in: query.observationTypes } } : {}),
        ...(observedAt ? { OR: [{ observationType: { in: staticTypes } }, { observedAt }] } : {}),
      },
      include: observationInclude,
      orderBy: [{ observedAt: "desc" }, { id: "asc" }],
      take: 1_000,
    });
    return records.map(toObservation);
  }

  async findNearestTemporalObservation(actor: Actor, entityId: string, eventAt: Date, allowedWindowMinutes: number): Promise<LocationObservationView | null> {
    const windowMs = allowedWindowMinutes * 60 * 1_000;
    const records = await prisma.entityLocationObservation.findMany({
      where: {
        ...departmentScope(actor),
        graphEntityId: entityId,
        graphEntity: departmentScope(actor),
        observationType: { in: [...temporalPresenceObservationTypes] },
        observedAt: { gte: new Date(eventAt.getTime() - windowMs), lte: new Date(eventAt.getTime() + windowMs) },
      },
      include: observationInclude,
      orderBy: [{ observedAt: "desc" }, { id: "asc" }],
      take: 100,
    });
    const closest = records.reduce<ObservationRecord | null>((current, candidate) => {
      if (!current) return candidate;
      const currentDistance = Math.abs(current.observedAt.getTime() - eventAt.getTime());
      const candidateDistance = Math.abs(candidate.observedAt.getTime() - eventAt.getTime());
      return candidateDistance < currentDistance || (candidateDistance === currentDistance && candidate.id < current.id) ? candidate : current;
    }, null);
    return closest ? toObservation(closest) : null;
  }

  async listActivities(actor: Actor, query: GeographicActivityQuery): Promise<GeographicActivityRecord[]> {
    if (query.entityIds.length === 0) return [];
    const occurredAt = timeWhere(query.startTime, query.endTime);
    const endpointWhere = { OR: [{ sourceEntityId: { in: query.entityIds } }, { destinationEntityId: { in: query.entityIds } }] };
    const [communications, financial] = await Promise.all([
      prisma.communicationRecord.findMany({
        where: { ...departmentScope(actor), ...endpointWhere, ...(occurredAt ? { occurredAt } : {}) },
        include: { sourceEntity: { select: { displayLabel: true, departmentId: true } }, destinationEntity: { select: { displayLabel: true, departmentId: true } }, case: { select: { firNumber: true, departmentId: true } } },
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        take: 500,
      }),
      prisma.financialTransaction.findMany({
        where: { ...departmentScope(actor), ...endpointWhere, ...(occurredAt ? { occurredAt } : {}) },
        include: { sourceEntity: { select: { displayLabel: true, departmentId: true } }, destinationEntity: { select: { displayLabel: true, departmentId: true } }, case: { select: { firNumber: true, departmentId: true } } },
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        take: 500,
      }),
    ]);
    const scopedCommunications = communications.filter((record) => record.sourceEntity.departmentId === record.departmentId && record.destinationEntity.departmentId === record.departmentId && (!record.case || record.case.departmentId === record.departmentId));
    const scopedFinancial = financial.filter((record) => record.sourceEntity.departmentId === record.departmentId && record.destinationEntity.departmentId === record.departmentId && (!record.case || record.case.departmentId === record.departmentId));
    return [
      ...scopedCommunications.map((record): GeographicActivityRecord => ({
        id: record.id,
        kind: "COMMUNICATION",
        recordNumber: record.communicationNumber,
        subtype: record.communicationType,
        occurredAt: record.occurredAt,
        sourceEntityId: record.sourceEntityId,
        sourceLabel: record.sourceEntity.displayLabel,
        destinationEntityId: record.destinationEntityId,
        destinationLabel: record.destinationEntity.displayLabel,
        durationSeconds: record.durationSeconds,
        amount: null,
        currency: null,
        caseId: record.caseId,
        caseFirNumber: record.case?.firNumber ?? null,
        incidentId: record.incidentId,
        sourceEvidenceId: record.sourceEvidenceId,
        verificationLevel: record.verificationLevel as IncidentVerificationLevel,
      })),
      ...scopedFinancial.map((record): GeographicActivityRecord => ({
        id: record.id,
        kind: "FINANCIAL",
        recordNumber: record.transactionNumber,
        subtype: record.transactionType,
        occurredAt: record.occurredAt,
        sourceEntityId: record.sourceEntityId,
        sourceLabel: record.sourceEntity.displayLabel,
        destinationEntityId: record.destinationEntityId,
        destinationLabel: record.destinationEntity.displayLabel,
        durationSeconds: null,
        amount: record.amount.toNumber(),
        currency: record.currency,
        caseId: record.caseId,
        caseFirNumber: record.case?.firNumber ?? null,
        incidentId: record.incidentId,
        sourceEvidenceId: record.sourceEvidenceId,
        verificationLevel: record.verificationLevel as IncidentVerificationLevel,
      })),
    ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime() || left.id.localeCompare(right.id));
  }

  async listFindings(actor: Actor, personId: string | null): Promise<GeographicFindingSummary[]> {
    if (!personId) return [];
    const records = await prisma.investigationFinding.findMany({
      where: { personId, ...departmentScope(actor), person: { cases: { some: { case: departmentScope(actor) } } } },
      include: { case: { select: { firNumber: true, departmentId: true } } },
      orderBy: [{ generatedAt: "desc" }, { id: "asc" }],
      take: 20,
    });
    return records.filter((record) => !record.case || record.case.departmentId === record.departmentId).map((record) => ({
      id: record.id,
      title: record.title,
      category: record.category,
      reviewStatus: record.reviewStatus as FindingReviewStatus,
      generatedAt: record.generatedAt,
      caseId: record.caseId,
      caseFirNumber: record.case?.firNumber ?? null,
    }));
  }
}
