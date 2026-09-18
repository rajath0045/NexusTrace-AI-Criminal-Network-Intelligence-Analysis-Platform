import type { Actor } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  incidentInputSchema,
  incidentReviewSchema,
  incidentUpdateSchema,
  incidentVerificationSchema,
  timelineQuerySchema,
  type IncidentDetail,
  type IncidentEntityReference,
  type IncidentInput,
  type IncidentReview,
  type IncidentSummary,
  type IncidentUpdate,
  type TimelineItem,
  type TimelineQuery,
} from "@/domain/incident";
import { IncidentVerificationLevel, UserRole } from "@/domain/model";
import { assertCan } from "@/server/authorization/policy";
import { PrismaIncidentRepository } from "@/server/repositories/prisma-incident-repository";
import type { IncidentRepository } from "@/server/repositories/incident-repository";

function parse<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } }): T {
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message);
  return result.data;
}

export class IncidentService {
  constructor(private readonly repository: IncidentRepository) {}

  async listIncidents(actor: Actor): Promise<IncidentSummary[]> {
    assertCan(actor, "CASE_VIEW");
    return this.repository.listForActor(actor);
  }

  async listIncidentEntityCandidates(actor: Actor): Promise<IncidentEntityReference[]> {
    assertCan(actor, "CASE_VIEW");
    return this.repository.listEntityCandidatesForActor(actor);
  }

  async getIncident(actor: Actor, incidentId: string): Promise<IncidentDetail> {
    assertCan(actor, "CASE_VIEW");
    const incident = await this.repository.findForActor(actor, incidentId);
    if (!incident) throw new NotFoundError();
    return incident;
  }

  async submitIncident(actor: Actor, input: IncidentInput): Promise<IncidentDetail> {
    assertCan(actor, "INCIDENT_SUBMIT");
    return this.repository.create(actor, parse(incidentInputSchema.safeParse(input)), "SUBMISSION");
  }

  async createIncident(actor: Actor, input: IncidentInput): Promise<IncidentDetail> {
    assertCan(actor, "INCIDENT_CREATE");
    return this.repository.create(actor, parse(incidentInputSchema.safeParse(input)), "CANONICAL");
  }

  async updateIncident(actor: Actor, incidentId: string, input: IncidentUpdate): Promise<IncidentDetail> {
    assertCan(actor, "INCIDENT_CREATE");
    const updated = await this.repository.update(actor, incidentId, parse(incidentUpdateSchema.safeParse(input)));
    if (!updated) throw new NotFoundError();
    return updated;
  }

  async reviewIncident(actor: Actor, incidentId: string, review: IncidentReview): Promise<IncidentDetail> {
    assertCan(actor, "INCIDENT_REVIEW");
    const reviewed = await this.repository.review(actor, incidentId, parse(incidentReviewSchema.safeParse(review)));
    if (!reviewed) throw new NotFoundError();
    return reviewed;
  }

  async verifyIncident(actor: Actor, incidentId: string, input: { level: IncidentVerificationLevel; reason: string }): Promise<IncidentDetail> {
    const parsed = parse(incidentVerificationSchema.safeParse(input));
    if (parsed.level === IncidentVerificationLevel.CrossVerified) {
      assertCan(actor, "INCIDENT_CROSS_VERIFY");
      if (actor.role !== UserRole.Administrator) throw new NotFoundError();
    } else {
      assertCan(actor, "INCIDENT_REVIEW");
    }
    const verified = await this.repository.verify(actor, incidentId, parsed.level, parsed.reason);
    if (!verified) throw new NotFoundError();
    return verified;
  }

  async getTimeline(actor: Actor, query: TimelineQuery): Promise<TimelineItem[]> {
    assertCan(actor, "CASE_VIEW");
    const timeline = await this.repository.timelineForActor(actor, parse(timelineQuerySchema.safeParse(query)));
    if (!timeline) throw new NotFoundError();
    return timeline;
  }
}

const incidentService = new IncidentService(new PrismaIncidentRepository());
export const listIncidents = incidentService.listIncidents.bind(incidentService);
export const listIncidentEntityCandidates = incidentService.listIncidentEntityCandidates.bind(incidentService);
export const getIncident = incidentService.getIncident.bind(incidentService);
export const submitIncident = incidentService.submitIncident.bind(incidentService);
export const createIncident = incidentService.createIncident.bind(incidentService);
export const updateIncident = incidentService.updateIncident.bind(incidentService);
export const reviewIncident = incidentService.reviewIncident.bind(incidentService);
export const verifyIncident = incidentService.verifyIncident.bind(incidentService);
export const getTimeline = incidentService.getTimeline.bind(incidentService);
