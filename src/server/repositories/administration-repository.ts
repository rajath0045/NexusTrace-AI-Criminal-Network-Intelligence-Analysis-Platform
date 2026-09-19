import type { Actor } from "@/domain/auth";
import type { AdminUserPage, DepartmentAdministrationView, GovernanceSummary, UserListQuery, UserUpdate } from "@/domain/administration";

export interface AdministrationRepository {
  listUsers(actor: Actor, query: UserListQuery): Promise<AdminUserPage>;
  updateUser(actor: Actor, userId: string, input: UserUpdate): Promise<void>;
  listDepartments(): Promise<DepartmentAdministrationView[]>;
  governanceSummary(): Promise<GovernanceSummary>;
}
