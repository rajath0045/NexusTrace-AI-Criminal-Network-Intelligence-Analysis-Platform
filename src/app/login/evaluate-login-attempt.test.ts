import { describe, expect, it } from "vitest";
import { UserRole } from "@/domain/model";
import { evaluateLoginAttempt } from "./evaluate-login-attempt";

const investigator = {
  id: "user-investigator",
  active: true,
  role: UserRole.Investigator,
};

describe("evaluateLoginAttempt", () => {
  it("authenticates only when credentials and the intended role both match", () => {
    expect(
      evaluateLoginAttempt({
        user: investigator,
        passwordMatches: true,
        intendedRole: UserRole.Investigator,
      }),
    ).toEqual({ outcome: "AUTHENTICATED", userId: "user-investigator" });
  });

  it("rejects incorrect credentials without granting a session", () => {
    expect(
      evaluateLoginAttempt({
        user: investigator,
        passwordMatches: false,
        intendedRole: UserRole.Investigator,
      }),
    ).toEqual({ outcome: "INVALID_CREDENTIALS" });
  });

  it("rejects a credential match when the selected access level differs from the stored role", () => {
    expect(
      evaluateLoginAttempt({
        user: investigator,
        passwordMatches: true,
        intendedRole: UserRole.Administrator,
      }),
    ).toEqual({ outcome: "ROLE_MISMATCH" });
  });

  it("rejects inactive accounts even with matching credentials and role", () => {
    expect(
      evaluateLoginAttempt({
        user: { ...investigator, active: false },
        passwordMatches: true,
        intendedRole: UserRole.Investigator,
      }),
    ).toEqual({ outcome: "INVALID_CREDENTIALS" });
  });
});
