import {
  AuthorizationError,
  capabilities,
  type Actor,
  type Capability,
} from "@/domain/auth";
import { UserRole } from "@/domain/model";

export type { Actor, Capability } from "@/domain/auth";

const roleCapabilities: Readonly<Record<UserRole, ReadonlySet<Capability>>> = {
  [UserRole.Investigator]: new Set([
    "CASE_VIEW",
    "RELATIONSHIP_SUGGEST",
  ]),
  [UserRole.DepartmentUser]: new Set([
    "CASE_VIEW",
    "CASE_CREATE",
    "EVIDENCE_ATTACH",
    "RELATIONSHIP_SUGGEST",
  ]),
  [UserRole.Administrator]: new Set(capabilities),
};

export function can(actor: Actor, capability: Capability): boolean {
  return roleCapabilities[actor.role].has(capability);
}

export function assertCan(actor: Actor, capability: Capability): void {
  if (!can(actor, capability)) {
    throw new AuthorizationError();
  }
}

export function canAccessDepartment(actor: Actor, departmentId: string): boolean {
  return actor.role === UserRole.Administrator || actor.departmentId === departmentId;
}
