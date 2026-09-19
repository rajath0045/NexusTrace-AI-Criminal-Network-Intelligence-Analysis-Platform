import type { Actor } from "@/domain/auth";
import { ValidationError } from "@/domain/errors";
import { auditQuerySchema } from "@/domain/audit";
import { assertCan } from "@/server/authorization/policy";
import { PrismaAuditRepository } from "@/server/repositories/prisma-audit-repository";
import type { AuditRepository } from "@/server/repositories/audit-repository";

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}
  async list(actor: Actor, query: unknown = {}) { assertCan(actor, "ADMINISTER"); const parsed = auditQuerySchema.safeParse(query); if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message); return this.repository.list(actor, parsed.data); }
  async options(actor: Actor) { assertCan(actor, "ADMINISTER"); return this.repository.options(); }
}
const auditService = new AuditService(new PrismaAuditRepository());
export const listAuditEvents = auditService.list.bind(auditService);
export const getAuditOptions = auditService.options.bind(auditService);
