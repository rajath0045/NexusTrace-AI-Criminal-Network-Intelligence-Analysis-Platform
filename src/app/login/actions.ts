"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { UserRole } from "@/domain/model";
import { createSession, destroyCurrentSession } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { prisma } from "@/server/db/client";
import { operationalLog } from "@/server/observability/logger";
import { takeRateLimit } from "@/server/security/rate-limit";
import { evaluateLoginAttempt } from "./evaluate-login-attempt";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  intendedRole: z.enum(UserRole),
});

export interface LoginState {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
    intendedRole?: string[];
  };
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    intendedRole: formData.get("intendedRole"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      error: fieldErrors.intendedRole
        ? "Select an authorized access level to continue."
        : "Enter a valid email address and password.",
      fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();
  try {
    takeRateLimit("login", createHash("sha256").update(email).digest("hex"));
  } catch {
    operationalLog.warn("authentication.rate_limited");
    return { error: "Too many sign-in attempts. Try again shortly." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  const comparisonHash =
    user?.passwordHash ?? (await hashPassword("invalid-credential-comparison"));
  const passwordMatches = await verifyPassword(
    comparisonHash,
    parsed.data.password,
  );
  const attempt = evaluateLoginAttempt({
    user: user
      ? { id: user.id, active: user.active, role: user.role as UserRole }
      : null,
    passwordMatches,
    intendedRole: parsed.data.intendedRole,
  });
  const authenticated = attempt.outcome === "AUTHENTICATED";
  const emailFingerprint = createHash("sha256").update(email).digest("hex");

  await prisma.auditEvent.create({
    data: {
      actorId: authenticated ? user?.id : null,
      departmentId: authenticated ? user?.departmentId : null,
      action: "AUTH_LOGIN",
      targetType: "SESSION",
      targetId: authenticated ? user?.id : null,
      outcome: authenticated ? "SUCCESS" : "DENIED",
      metadata: {
        emailFingerprint,
        intendedRole: parsed.data.intendedRole,
      },
    },
  });

  if (!authenticated || !user) {
    operationalLog.warn("authentication.denied", { outcome: attempt.outcome });
    if (attempt.outcome === "ROLE_MISMATCH") {
      return {
        error: "These credentials are not authorized for the selected access level.",
      };
    }

    return { error: "The email address or password is incorrect." };
  }

  await createSession(user.id);
  operationalLog.info("authentication.succeeded", { actorId: user.id, role: user.role });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<never> {
  await destroyCurrentSession();
  redirect("/login");
}
