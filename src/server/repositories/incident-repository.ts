import type { Actor } from "@/domain/auth";
import type {
  IncidentDetail,
  IncidentInput,
  IncidentReview,
  IncidentSummary,
  IncidentUpdate,
  TimelineItem,
  TimelineQuery,
} from "@/domain/incident";
import type { IncidentVerificationLevel } from "@/domain/model";

export interface IncidentRepository {
  listForActor(actor: Actor): Promise<IncidentSummary[]>;
  findForActor(actor: Actor, incidentId: string): Promise<IncidentDetail | null>;
  create(actor: Actor, input: IncidentInput, mode: "SUBMISSION" | "CANONICAL"): Promise<IncidentDetail>;
  update(actor: Actor, incidentId: string, input: IncidentUpdate): Promise<IncidentDetail | null>;
  review(actor: Actor, incidentId: string, review: IncidentReview): Promise<IncidentDetail | null>;
  verify(actor: Actor, incidentId: string, level: IncidentVerificationLevel, reason: string): Promise<IncidentDetail | null>;
  timelineForActor(actor: Actor, query: TimelineQuery): Promise<TimelineItem[] | null>;
}
