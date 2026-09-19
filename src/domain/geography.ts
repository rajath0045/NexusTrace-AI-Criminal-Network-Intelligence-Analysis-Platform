import { z } from "zod";
import type { GraphEntityView, GraphNeighborhood } from "./graph";
import type { TimelineItem } from "./incident";
import {
  FindingReviewStatus,
  GraphEntityType,
  IncidentVerificationLevel,
  LocationObservationType,
  LocationSourceRecordType,
  RelationshipStrength,
  VerificationState,
} from "./model";

const optionalUuid = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value,
  z.string().uuid().optional(),
);

export const temporalPresenceObservationTypes = [
  LocationObservationType.ObservedPersonLocation,
  LocationObservationType.VehicleObservation,
  LocationObservationType.DeviceObservation,
  LocationObservationType.IncidentLocation,
  LocationObservationType.EvidenceLocation,
  LocationObservationType.OtherAuthorizedObservation,
] as const;

export const locationObservationInputSchema = z.object({
  graphEntityId: z.string().uuid(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  observedAt: z.coerce.date(),
  observationType: z.enum(LocationObservationType),
  locationLabel: z.string().trim().min(2).max(240),
  context: z.string().trim().max(1_000).optional(),
  accuracyMeters: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sourceRecordType: z.enum(LocationSourceRecordType),
  sourceRecordId: z.string().uuid(),
  sourceEvidenceId: optionalUuid,
  verificationLevel: z.enum(IncidentVerificationLevel).default(IncidentVerificationLevel.Unverified),
});

export const geographicProjectionQuerySchema = z.object({
  focusEntityId: z.string().uuid(),
  hops: z.coerce.number().int().min(1).max(3).default(1),
  strengths: z.array(z.enum(RelationshipStrength)).min(1).default([RelationshipStrength.Primary]),
  verificationStates: z.array(z.enum(VerificationState)).min(1).default([VerificationState.Verified]),
  observationTypes: z.array(z.enum(LocationObservationType)).min(1).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  allowedLocationWindowMinutes: z.coerce.number().int().min(1).max(24 * 60).default(180),
}).superRefine((value, context) => {
  if (value.startTime && value.endTime && value.startTime > value.endTime) {
    context.addIssue({ code: "custom", message: "The geographic time window is invalid.", path: ["startTime"] });
  }
  if (value.startTime && value.endTime && value.endTime.getTime() - value.startTime.getTime() > 366 * 24 * 60 * 60 * 1_000) {
    context.addIssue({ code: "custom", message: "The geographic time window cannot exceed 366 days.", path: ["endTime"] });
  }
});

export type LocationObservationInput = z.infer<typeof locationObservationInputSchema>;
export type GeographicProjectionQuery = z.infer<typeof geographicProjectionQuerySchema>;

export interface LocationObservationView {
  id: string;
  graphEntityId: string;
  entityType: GraphEntityType;
  entityLabel: string;
  latitude: number;
  longitude: number;
  observedAt: Date;
  observationType: LocationObservationType;
  locationLabel: string;
  context: string | null;
  accuracyMeters: number | null;
  sourceRecordType: LocationSourceRecordType;
  sourceRecordId: string;
  sourceEvidenceId: string | null;
  verificationLevel: IncidentVerificationLevel;
}

export interface TemporalLocationResolution {
  status: "KNOWN" | "UNKNOWN";
  eventAt: Date;
  temporalDistanceSeconds: number | null;
  observation: LocationObservationView | null;
}

export interface GeographicActivityRecord {
  id: string;
  kind: "COMMUNICATION" | "FINANCIAL";
  recordNumber: string;
  subtype: string;
  occurredAt: Date;
  sourceEntityId: string;
  sourceLabel: string;
  destinationEntityId: string;
  destinationLabel: string;
  durationSeconds: number | null;
  amount: number | null;
  currency: string | null;
  caseId: string | null;
  caseFirNumber: string | null;
  incidentId: string | null;
  sourceEvidenceId: string | null;
  verificationLevel: IncidentVerificationLevel;
}

export interface GeolocatedActivityRecord extends GeographicActivityRecord {
  sourceLocation: TemporalLocationResolution;
  destinationLocation: TemporalLocationResolution;
}

export interface GeographicConnectionRecord {
  id: string;
  kind: "RELATIONSHIP" | "COMMUNICATION" | "FINANCIAL";
  label: string;
  occurredAt: Date | null;
  interactionCount: number;
  verification: string;
  sourceEvidenceId: string | null;
  caseId: string | null;
  caseFirNumber: string | null;
  sourceLocation: TemporalLocationResolution | null;
  destinationLocation: TemporalLocationResolution | null;
  durationSeconds: number | null;
  amount: number | null;
  currency: string | null;
}

export interface GeographicConnection {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  sourceLabel: string;
  targetLabel: string;
  sourceObservation: LocationObservationView | null;
  targetObservation: LocationObservationView | null;
  strength: RelationshipStrength | null;
  verification: string;
  relationshipIds: string[];
  counts: { calls: number; messages: number; emails: number; digitalContacts: number; financial: number; relationships: number };
  records: GeographicConnectionRecord[];
}

export interface GeographicFindingSummary {
  id: string;
  title: string;
  category: string;
  reviewStatus: FindingReviewStatus;
  generatedAt: Date;
  caseId: string | null;
  caseFirNumber: string | null;
  supportingRecordCount: number;
  evidenceCount: number;
}

export interface GeographicProjection {
  graph: GraphNeighborhood;
  focusEntity: GraphEntityView;
  observations: LocationObservationView[];
  connections: GeographicConnection[];
  activities: GeolocatedActivityRecord[];
  timeline: TimelineItem[];
  findings: GeographicFindingSummary[];
  summary: {
    communicationCount: number;
    financialCount: number;
    verifiedObservationCount: number;
    relatedCaseCount: number;
    evidenceCount: number;
    unknownEndpointCount: number;
  };
  generatedAt: Date;
}
