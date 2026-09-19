import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type { AuditEventPage, AuditEventView, AuditQuery } from "@/domain/audit";
import { prisma } from "@/server/db/client";
import type { AuditRepository } from "./audit-repository";

const sensitive = /password|token|secret|hash|storage|checksum|authorization|cookie/i;
const recordId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitized(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitized(item, depth + 1));
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive.test(key)).slice(0, 30).map(([key, entry]) => [key, sanitized(entry, depth + 1)]));
  return null;
}

function metadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const result = sanitized(value);
  return result && typeof result === "object" && !Array.isArray(result) ? result as Record<string, unknown> : null;
}

function related(value: Prisma.JsonValue | null, key: "caseId" | "incidentId"): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const candidate = value[key];
  return typeof candidate === "string" && recordId.test(candidate) ? candidate : null;
}

export class PrismaAuditRepository implements AuditRepository {
  async list(_actor: Actor, query: AuditQuery): Promise<AuditEventPage> {
    const relatedFilter = query.relatedRecordId ? [{ OR: [
      { targetId: query.relatedRecordId },
      { metadata: { path: ["caseId"], equals: query.relatedRecordId } },
      { metadata: { path: ["incidentId"], equals: query.relatedRecordId } },
    ] }] : [];
    const where: Prisma.AuditEventWhereInput = { AND: [
      ...(query.actorId ? [{ actorId: query.actorId }] : []), ...(query.departmentId ? [{ departmentId: query.departmentId }] : []),
      ...(query.action ? [{ action: query.action }] : []), ...(query.targetType ? [{ targetType: query.targetType }] : []), ...relatedFilter,
      ...(query.startTime || query.endTime ? [{ createdAt: { ...(query.startTime ? { gte: query.startTime } : {}), ...(query.endTime ? { lte: query.endTime } : {}) } }] : []),
    ] };
    const anchor = query.cursor ? await prisma.auditEvent.findFirst({ where: { AND: [where, { id: query.cursor }] }, select: { id: true, createdAt: true } }) : null;
    if (query.cursor && !anchor) return { items: [], nextCursor: null };
    const records = await prisma.auditEvent.findMany({ where: { AND: [where, ...(anchor ? [{ OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { gt: anchor.id } }] }] : [])] }, include: { actor: { select: { id: true, displayName: true, role: true } }, department: { select: { id: true, name: true, code: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: query.limit + 1 });
    const items = records.slice(0, query.limit).map((record): AuditEventView => ({ id: record.id, action: record.action, targetType: record.targetType, targetId: record.targetId, outcome: record.outcome, createdAt: record.createdAt, actor: record.actor ? { ...record.actor, role: record.actor.role } : null, department: record.department, relatedCaseId: related(record.metadata, "caseId"), relatedIncidentId: related(record.metadata, "incidentId"), reason: typeof record.metadata === "object" && record.metadata && !Array.isArray(record.metadata) && typeof record.metadata.reason === "string" ? record.metadata.reason : null, metadata: metadata(record.metadata) }));
    return { items, nextCursor: records.length > query.limit ? items.at(-1)?.id ?? null : null };
  }

  async options() {
    const [actors, departments, actionGroups, targetGroups] = await Promise.all([
      prisma.user.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
      prisma.department.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
      prisma.auditEvent.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
      prisma.auditEvent.groupBy({ by: ["targetType"], orderBy: { targetType: "asc" } }),
    ]);
    return { actors, departments, actions: actionGroups.map((entry) => entry.action), targetTypes: targetGroups.map((entry) => entry.targetType) };
  }
}
