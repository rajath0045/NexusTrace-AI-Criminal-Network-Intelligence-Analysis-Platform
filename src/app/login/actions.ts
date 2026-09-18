"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroyCurrentSession } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { prisma } from "@/server/db/client";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export interface LoginState {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid email address and password.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const comparisonHash =
    user?.passwordHash ?? (await hashPassword("invalid-credential-comparison"));
  const passwordMatches = await verifyPassword(
    comparisonHash,
    parsed.data.password,
  );
  const authenticated = Boolean(user?.active && passwordMatches);
  const emailFingerprint = createHash("sha256").update(email).digest("hex");

  await prisma.auditEvent.create({
    data: {
      actorId: authenticated ? user?.id : null,
      departmentId: authenticated ? user?.departmentId : null,
      action: "AUTH_LOGIN",
      targetType: "SESSION",
      targetId: authenticated ? user?.id : null,
      outcome: authenticated ? "SUCCESS" : "DENIED",
      metadata: { emailFingerprint },
    },
  });

  if (!authenticated || !user) {
    return { error: "The email address or password is incorrect." };
  }

  await createSession(user.id);
  redirect("/cases");
}

export async function logoutAction(): Promise<never> {
  await destroyCurrentSession();
  redirect("/login");
}
