import type { UserRole } from "./model";

export const capabilities = [
  "CASE_VIEW",
  "CASE_CREATE",
  "EVIDENCE_ATTACH",
  "RELATIONSHIP_SUGGEST",
  "RELATIONSHIP_VERIFY",
  "ADMINISTER",
] as const;

export type Capability = (typeof capabilities)[number];

export interface Actor {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  departmentId: string;
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}
