import { z } from "zod";
import {
  EvidenceConfidence,
  GraphEntityType,
  RelationshipStrength,
  VerificationState,
} from "./model";

export const graphIdSchema = z.string().uuid();

export const graphFiltersSchema = z.object({
  hops: z.number().int().min(1).max(3),
  strengths: z.array(z.enum(RelationshipStrength)).min(1),
  verificationStates: z.array(z.enum(VerificationState)).min(1),
});

export const defaultGraphFilters: GraphFilters = {
  hops: 1,
  strengths: [RelationshipStrength.Primary],
  verificationStates: [VerificationState.Verified],
};

const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.date().optional(),
);

export const graphSourceInputSchema = z.object({
  evidenceId: z.string().uuid(),
  sourceCaseId: z.string().uuid(),
  note: z.string().trim().max(1_000).optional(),
});

export const relationshipInputSchema = z.object({
  sourceEntityId: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  relationshipType: z.string().trim().min(2).max(80)
    .transform((value) => value.toUpperCase().replace(/\s+/g, "_"))
    .pipe(z.string().regex(/^[A-Z][A-Z0-9_]*$/)),
  strength: z.enum(RelationshipStrength),
  evidenceConfidence: z.enum(EvidenceConfidence),
  interactionCount: z.number().int().min(0).max(1_000_000).default(0),
  interactionSummary: z.string().trim().max(2_000).optional(),
  firstObservedAt: optionalDate,
  latestObservedAt: optionalDate,
  sources: z.array(graphSourceInputSchema).max(50).default([]),
}).superRefine((value, context) => {
  if (value.sourceEntityId === value.targetEntityId) {
    context.addIssue({ code: "custom", message: "A relationship cannot connect an entity to itself.", path: ["targetEntityId"] });
  }
  if (value.firstObservedAt && value.latestObservedAt && value.latestObservedAt < value.firstObservedAt) {
    context.addIssue({ code: "custom", message: "Latest observation cannot precede the first observation.", path: ["latestObservedAt"] });
  }
  if (new Set(value.sources.map((source) => source.evidenceId)).size !== value.sources.length) {
    context.addIssue({ code: "custom", message: "Each supporting evidence record may be selected only once.", path: ["sources"] });
  }
});

export const relationshipReviewSchema = z.object({
  decision: z.enum([
    VerificationState.Verified,
    VerificationState.Rejected,
    VerificationState.ChangesRequested,
  ]),
});

export type GraphFilters = z.infer<typeof graphFiltersSchema>;
export type GraphSourceInput = z.infer<typeof graphSourceInputSchema>;
export type RelationshipInput = z.infer<typeof relationshipInputSchema>;
export type RelationshipReview = z.infer<typeof relationshipReviewSchema>;

export interface GraphEntityView {
  id: string;
  entityType: GraphEntityType;
  displayLabel: string;
  verificationState: VerificationState;
  canonicalRecord: { type: "PERSON" | "CASE" | "INCIDENT"; id: string } | null;
}

export interface GraphEdgeView {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  strength: RelationshipStrength;
  evidenceConfidence: EvidenceConfidence;
  verificationState: VerificationState;
  interactionCount: number;
  interactionSummary: string | null;
  firstObservedAt: Date | null;
  latestObservedAt: Date | null;
}

export interface GraphSource {
  id: string;
  evidenceId: string;
  evidenceFilename: string;
  evidenceVerificationState: VerificationState;
  sourceCaseId: string;
  sourceFirNumber: string;
  sourceCaseTitle: string;
  note: string | null;
}

export interface GraphNeighborhood {
  focusEntity: GraphEntityView;
  nodes: GraphEntityView[];
  edges: GraphEdgeView[];
  activeFilters: GraphFilters;
  provenanceSummaries: Array<{
    relationshipId: string;
    sourceCount: number;
    sourceCaseIds: string[];
  }>;
}

export interface RelationshipDetail extends GraphEdgeView {
  sourceEntity: GraphEntityView;
  targetEntity: GraphEntityView;
  departmentName: string;
  createdByName: string;
  verifiedByName: string | null;
  verifiedAt: Date | null;
  provenance: GraphSource[];
}

export interface RelationshipPersistenceState {
  verificationState: VerificationState;
  verifiedById: string | null;
  verifiedAt: Date | null;
  auditAction: "RELATIONSHIP_PROPOSE" | "RELATIONSHIP_CREATE_VERIFIED";
}
