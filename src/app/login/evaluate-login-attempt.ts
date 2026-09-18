import type { UserRole } from "@/domain/model";

interface LoginCandidate {
  id: string;
  active: boolean;
  role: UserRole;
}

export type LoginAttemptResult =
  | { outcome: "AUTHENTICATED"; userId: string }
  | { outcome: "INVALID_CREDENTIALS" }
  | { outcome: "ROLE_MISMATCH" };

export function evaluateLoginAttempt(input: {
  user: LoginCandidate | null;
  passwordMatches: boolean;
  intendedRole: UserRole;
}): LoginAttemptResult {
  if (!input.user?.active || !input.passwordMatches) {
    return { outcome: "INVALID_CREDENTIALS" };
  }

  if (input.user.role !== input.intendedRole) {
    return { outcome: "ROLE_MISMATCH" };
  }

  return { outcome: "AUTHENTICATED", userId: input.user.id };
}
