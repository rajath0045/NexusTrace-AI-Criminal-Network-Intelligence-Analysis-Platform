import type { Actor } from "@/domain/auth";
import { copilotQuestionSchema, findingQueueQuerySchema, findingReviewInputSchema, investigationQuerySchema, type CopilotAnswer, type FindingQueueQuery, type FindingReviewInput, type InvestigationAnalysis, type InvestigationQuery, type PersistedFindingView } from "@/domain/investigation";
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

  async listFindings(actor: Actor, query: FindingQueueQuery = {}): Promise<PersistedFindingView[]> {
    assertCan(actor, "INVESTIGATION_ANALYZE");
    return this.findings.list(actor, parse(findingQueueQuerySchema.safeParse(query)));
  }

  async reviewFinding(actor: Actor, findingId: string, input: FindingReviewInput): Promise<PersistedFindingView> {
    assertCan(actor, "FINDING_REVIEW");
    const result = await this.findings.review(actor, findingId, parse(findingReviewInputSchema.safeParse(input)));
    if (!result) throw new NotFoundError();
    return result;
  }

  async answer(actor: Actor, input: InvestigationQuery & { question: string }): Promise<CopilotAnswer> {
    const parsed = parse(copilotQuestionSchema.safeParse(input));
    const analysis = await this.analyze(actor, parsed);
    const question = parsed.question.toLowerCase();
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
    return { answer, supportingRecordIds: [...new Set(findings.flatMap((finding) => finding.supportingRecordIds))], evidence: [...new Map(findings.flatMap((finding) => finding.evidence).map((entry) => [entry.id, entry])).values()], verificationLevels: [...new Set(findings.flatMap((finding) => finding.verificationLevels))], notice: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED" };
  }
}

const investigationService = new InvestigationService(new PrismaInvestigationRepository());
export const analyzeInvestigation = investigationService.analyze.bind(investigationService);
export const answerInvestigationQuestion = investigationService.answer.bind(investigationService);
export const listInvestigationFindings = investigationService.listFindings.bind(investigationService);
export const reviewInvestigationFinding = investigationService.reviewFinding.bind(investigationService);
