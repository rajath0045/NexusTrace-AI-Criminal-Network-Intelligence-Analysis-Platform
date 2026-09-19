import { z } from "zod";
import type { Actor } from "@/domain/auth";
import { ValidationError } from "@/domain/errors";
import { userListQuerySchema, userUpdateSchema } from "@/domain/administration";
import { assertCan } from "@/server/authorization/policy";
import { PrismaAdministrationRepository } from "@/server/repositories/prisma-administration-repository";
import type { AdministrationRepository } from "@/server/repositories/administration-repository";

function parse<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } }): T { if (!result.success) throw new ValidationError(result.error.issues[0]?.message); return result.data; }

export class AdministrationService {
  constructor(private readonly repository: AdministrationRepository) {}
  async users(actor: Actor, query: unknown = {}) { assertCan(actor, "ADMINISTER"); return this.repository.listUsers(actor, parse(userListQuerySchema.safeParse(query))); }
  async updateUser(actor: Actor, userId: string, input: unknown) { assertCan(actor, "ADMINISTER"); if (!z.string().uuid().safeParse(userId).success) throw new ValidationError("The operator identifier is invalid."); await this.repository.updateUser(actor, userId, parse(userUpdateSchema.safeParse(input))); }
  async departments(actor: Actor) { assertCan(actor, "ADMINISTER"); return this.repository.listDepartments(); }
  async governance(actor: Actor) { assertCan(actor, "ADMINISTER"); return this.repository.governanceSummary(); }
}
const administrationService = new AdministrationService(new PrismaAdministrationRepository());
export const listAdministrationUsers = administrationService.users.bind(administrationService);
export const updateAdministrationUser = administrationService.updateUser.bind(administrationService);
export const listAdministrationDepartments = administrationService.departments.bind(administrationService);
export const getAdministrationGovernance = administrationService.governance.bind(administrationService);
