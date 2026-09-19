import { Prisma, UserRole } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type { AdminUserPage, AdminUserView, DepartmentAdministrationView, GovernanceSummary, UserListQuery, UserUpdate } from "@/domain/administration";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import { prisma } from "@/server/db/client";
import type { AdministrationRepository } from "./administration-repository";

const select = { id: true, displayName: true, email: true, role: true, active: true, createdAt: true, updatedAt: true, department: { select: { id: true, code: true, name: true } } } as const;
function view(record: Prisma.UserGetPayload<{ select: typeof select }>): AdminUserView { return { ...record, role: record.role as AdminUserView["role"] }; }

export class PrismaAdministrationRepository implements AdministrationRepository {
  async listUsers(_actor: Actor, query: UserListQuery): Promise<AdminUserPage> {
    const where: Prisma.UserWhereInput = { AND: [
      ...(query.q ? [{ OR: [{ displayName: { contains: query.q, mode: "insensitive" as const } }, { email: { contains: query.q, mode: "insensitive" as const } }] }] : []),
      ...(query.role ? [{ role: query.role }] : []), ...(query.departmentId ? [{ departmentId: query.departmentId }] : []),
      ...(query.active === undefined ? [] : [{ active: query.active }]),
    ] };
    const anchor = query.cursor ? await prisma.user.findFirst({ where: { AND: [where, { id: query.cursor }] }, select: { id: true, createdAt: true } }) : null;
    if (query.cursor && !anchor) return { items: [], nextCursor: null };
    const records = await prisma.user.findMany({ where: { AND: [where, ...(anchor ? [{ OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { gt: anchor.id } }] }] : [])] }, select, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: query.limit + 1 });
    const items = records.slice(0, query.limit).map(view);
    return { items, nextCursor: records.length > query.limit ? items.at(-1)?.id ?? null : null };
  }

  async updateUser(actor: Actor, userId: string, input: UserUpdate): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, active: true, departmentId: true, displayName: true } });
      if (!target) throw new NotFoundError("That operator could not be found.");
      if (target.id === actor.userId) throw new ValidationError("Administrators cannot change their own role, department, or active state here.");
      if (input.departmentId) {
        const department = await tx.department.findUnique({ where: { id: input.departmentId }, select: { id: true } });
        if (!department) throw new ValidationError("Choose an existing department.");
      }
      const nextRole = input.role ?? target.role;
      const nextActive = input.active ?? target.active;
      if (target.role === UserRole.ADMINISTRATOR && (!nextActive || nextRole !== UserRole.ADMINISTRATOR)) {
        const activeAdministrators = await tx.user.count({ where: { role: UserRole.ADMINISTRATOR, active: true } });
        if (activeAdministrators <= 1) throw new ConflictError("At least one active administrator must remain available.");
      }
      const before = { role: target.role, active: target.active, departmentId: target.departmentId };
      const updated = await tx.user.update({ where: { id: target.id }, data: { ...input }, select: { role: true, active: true, departmentId: true } });
      await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: actor.departmentId, action: "ADMIN_USER_UPDATE", targetType: "USER", targetId: target.id, outcome: "SUCCESS", metadata: { before, after: updated, reason: "Authorized administration update" } } });
    });
  }

  async listDepartments(): Promise<DepartmentAdministrationView[]> {
    const departments = await prisma.department.findMany({ include: { _count: { select: { users: true, cases: true, incidents: true, investigationFindings: true } }, users: { where: { active: true }, select: { id: true } } }, orderBy: { name: "asc" } });
    return departments.map(({ _count, users, ...department }) => ({ ...department, memberCount: _count.users, activeMemberCount: users.length, caseCount: _count.cases, incidentCount: _count.incidents, findingCount: _count.investigationFindings }));
  }

  async governanceSummary(): Promise<GovernanceSummary> {
    const [departmentVerifiedIncidents, crossVerifiedIncidents, openIncidentReviews, escalatedFindings] = await Promise.all([
      prisma.incident.count({ where: { verificationLevel: "DEPARTMENT_VERIFIED" } }), prisma.incident.count({ where: { verificationLevel: "CROSS_VERIFIED" } }),
      prisma.incident.count({ where: { submissionStatus: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } } }), prisma.investigationFinding.count({ where: { reviewStatus: "ESCALATED" } }),
    ]);
    return { departmentVerifiedIncidents, crossVerifiedIncidents, openIncidentReviews, escalatedFindings };
  }
}
