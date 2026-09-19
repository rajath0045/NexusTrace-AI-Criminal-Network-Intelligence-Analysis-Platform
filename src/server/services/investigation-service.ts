import type { Actor } from "@/domain/auth";
import { z } from "zod";
import { FindingReviewStatus } from "@/domain/model";
import { copilotQuestionSchema, findingQueueQuerySchema, findingReviewInputSchema, investigationQuerySchema, type CopilotAnswer, type FindingQualityMetrics, type FindingQueuePage, type FindingQueueQuery, type FindingReviewInput, type InvestigationAnalysis, type InvestigationQuery, type PersistedFindingView } from "@/domain/investigation";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { assertCan } from "@/server/authorization/policy";
import { buildDeterministicAnalysis } from "@/server/investigation/deterministic-analysis";
import { PrismaInvestigationRepository } from "@/server/repositories/prisma-investigation-repository";
import type { InvestigationRepository } from "@/server/repositories/investigation-repository";
import { PrismaFindingRepository } from "@/server/repositories/prisma-finding-repository";
import type { FindingRepository } from "@/server/repositories/finding-repository";
import { getTimeline } from "./incident-service";

function parse<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } }): T {
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message);
  return result.data;
}

export class InvestigationService {
  constructor(private readonly repository: InvestigationRepository, private readonly findings: FindingRepository = new PrismaFindingRepository()) {}

  async analyze(actor: Actor, query: InvestigationQuery): Promise<InvestigationAnalysis> {
    assertCan(actor, "INVESTIGATION_ANALYZE");
    const parsed = parse(investigationQuerySchema.safeParse(query));
    const context = await this.repository.contextForActor(actor, parsed);
    if (!context) throw new NotFoundError();
    const analysis = buildDeterministicAnalysis(context, parsed.beforeDays, parsed.afterDays);
    analysis.timeline = await getTimeline(actor, { personId: parsed.personId, startTime: analysis.window.startTime, endTime: analysis.window.endTime, types: ["ALL"] });
    const persisted = await this.findings.sync(actor, analysis);
    analysis.findings = analysis.findings.map((finding) => ({ ...finding, persistentId: persisted.get(finding.id)?.id, reviewStatus: persisted.get(finding.id)?.status as InvestigationAnalysis["findings"][number]["reviewStatus"] ?? finding.reviewStatus }));
    return analysis;
  }

  async listFindings(actor: Actor, query: FindingQueueQuery = { limit: 25 }): Promise<FindingQueuePage> {
    assertCan(actor, "INVESTIGATION_ANALYZE");
    return this.findings.list(actor, parse(findingQueueQuerySchema.safeParse(query)));
  }

  async findingMetrics(actor: Actor): Promise<FindingQualityMetrics> { assertCan(actor, "INVESTIGATION_ANALYZE"); return this.findings.metrics(actor); }

  async findingDepartments(actor: Actor) { assertCan(actor, "INVESTIGATION_ANALYZE"); return this.findings.departments(actor); }

  async reviewFinding(actor: Actor, findingId: string, input: FindingReviewInput): Promise<PersistedFindingView> {
    assertCan(actor, "FINDING_REVIEW");
    if (!z.string().uuid().safeParse(findingId).success) throw new NotFoundError();
    const result = await this.findings.review(actor, findingId, parse(findingReviewInputSchema.safeParse(input)));
    if (!result) throw new NotFoundError();
    return result;
  }

  async getFinding(actor: Actor, findingId: string): Promise<PersistedFindingView> {
    assertCan(actor, "INVESTIGATION_ANALYZE");
    if (!z.string().uuid().safeParse(findingId).success) throw new NotFoundError();
    const result = await this.findings.find(actor, findingId);
    if (!result) throw new NotFoundError();
    return result;
  }

  async answer(actor: Actor, input: InvestigationQuery & { question: string; findingId?: string }): Promise<CopilotAnswer> {
    assertCan(actor, "INVESTIGATION_ANALYZE");
    const parsed = parse(copilotQuestionSchema.safeParse(input));
    const question = parsed.question.toLowerCase();
    const response = (answer: string, findings: InvestigationAnalysis["findings"]): CopilotAnswer => ({ answer,
      supportingRecordIds: [...new Set(findings.flatMap((finding) => finding.supportingRecordIds))],
      evidence: [...new Map(findings.flatMap((finding) => finding.evidence).map((entry) => [entry.id, entry])).values()],
      verificationLevels: [...new Set(findings.flatMap((finding) => finding.verificationLevels))],
      notice: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED" });
    if (parsed.findingId) {
      const finding = await this.getFinding(actor, parsed.findingId);
      const history = [...finding.reviews].reverse().map((review) => `${review.createdAt.toISOString()}: ${review.previousStatus} → ${review.status}; ${review.reasonCode}; ${review.note ?? "No note recorded"} (${review.reviewerName}, ${review.reviewerDepartmentName}).`).join(" ");
      return response(`${finding.title}. ${finding.detail} Current human review state: ${finding.reviewStatus}. ${history || "No human review has been recorded; no missing-evidence conclusion is inferred."} Supporting records: ${finding.supportingRecords?.map((record) => `${record.label} (${record.verificationState})`).join(", ") || "None currently available"}.`, [finding]);
    }
    const fir = parsed.question.match(/\bFIR[-\w/]+/i)?.[0];
    if (fir || /review|dismiss|escalat|missing|evidence needed/.test(question)) {
      const status = question.includes("escalat") ? FindingReviewStatus.Escalated
        : question.includes("dismiss") ? FindingReviewStatus.Dismissed
          : /missing|evidence needed/.test(question) ? FindingReviewStatus.NeedsMoreEvidence : undefined;
      const page = await this.listFindings(actor, { limit: 25, status, ...(fir ? { caseFirNumber: fir } : { personId: parsed.personId, incidentId: parsed.incidentId }) });
      return response(page.items.length ? `${page.items.map((finding) => `${finding.title}: ${finding.reviewStatus}; ${finding.reviews[0]?.reasonCode ?? "No review"}; ${finding.reviews[0]?.note ?? "No note"}.`).join(" ")}${page.nextCursor ? " More authorized results are available in the Findings Queue." : ""}` : "No authorized persisted findings match this review question.", page.items);
    }
    // Copilot reads context and dispositions without persisting or updating analysis.
    const context = await this.repository.contextForActor(actor, parsed);
    if (!context) throw new NotFoundError();
    const analysis = buildDeterministicAnalysis(context, parsed.beforeDays, parsed.afterDays);
    const page = await this.listFindings(actor, { limit: 50, personId: parsed.personId, incidentId: parsed.incidentId });
    for (const finding of analysis.findings) {
      const persisted = page.items.find((item) => item.category === finding.category && item.title === finding.title && item.windowStart.getTime() === analysis.window.startTime.getTime() && item.windowEnd.getTime() === analysis.window.endTime.getTime());
      if (persisted) finding.reviewStatus = persisted.reviewStatus;
    }
    const select = (categories: readonly string[]) => analysis.findings.filter((finding) => categories.includes(finding.category));
    const findings = question.includes("commun") || question.includes("contact")
      ? select(["COMMUNICATION"])
      : question.includes("financ") || question.includes("transaction") || question.includes("money")
        ? select(["FINANCIAL"])
        : question.includes("network") || question.includes("relationship") || question.includes("connect")
          ? select(["NETWORK", "CROSS_CASE"])
          : analysis.findings;
    const fallback = "No deterministic lead matched the selected question and authorized incident window. Review the unified timeline and its protected source records for context.";
    const answer = findings.length
      ? findings.map((finding) => `${finding.title}: ${finding.detail} Current human review state: ${finding.reviewStatus.replaceAll("_", " ")}.`).join(" ")
      : fallback;
    return response(answer, findings);
  }
}

const investigationService = new InvestigationService(new PrismaInvestigationRepository());
export const analyzeInvestigation = investigationService.analyze.bind(investigationService);
export const answerInvestigationQuestion = investigationService.answer.bind(investigationService);
export const listInvestigationFindings = investigationService.listFindings.bind(investigationService);
export const reviewInvestigationFinding = investigationService.reviewFinding.bind(investigationService);
export const getFindingMetrics = investigationService.findingMetrics.bind(investigationService);
export const getFindingDepartments = investigationService.findingDepartments.bind(investigationService);
export const getInvestigationFinding = investigationService.getFinding.bind(investigationService);
