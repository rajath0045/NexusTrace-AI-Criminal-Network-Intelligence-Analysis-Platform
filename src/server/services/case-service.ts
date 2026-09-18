import type { Actor } from "@/domain/auth";
import { caseInputSchema, type CaseDetail, type CaseInput, type CaseSummary } from "@/domain/case";
import { NotFoundError } from "@/domain/errors";
import { assertCan } from "@/server/authorization/policy";
import { PrismaCaseRepository } from "@/server/repositories/prisma-case-repository";
import type { CaseRepository } from "@/server/repositories/case-repository";

export class CaseService {
  constructor(private readonly repository: CaseRepository) {}

  async listCases(actor: Actor): Promise<CaseSummary[]> {
    assertCan(actor, "CASE_VIEW");
    return this.repository.listForActor(actor);
  }

  async getCase(actor: Actor, caseId: string): Promise<CaseDetail> {
    assertCan(actor, "CASE_VIEW");
    const record = await this.repository.findForActor(actor, caseId);
    if (!record) throw new NotFoundError();
    return record;
  }

  async createCase(actor: Actor, input: CaseInput): Promise<CaseDetail> {
    assertCan(actor, "CASE_CREATE");
    const parsed = caseInputSchema.parse(input);
    return this.repository.create(actor, parsed);
  }
}

const caseService = new CaseService(new PrismaCaseRepository());

export const listCases = caseService.listCases.bind(caseService);
export const getCase = caseService.getCase.bind(caseService);
export const createCase = caseService.createCase.bind(caseService);
