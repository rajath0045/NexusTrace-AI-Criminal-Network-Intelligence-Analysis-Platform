import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Actor } from "@/domain/auth";
import { PrismaSessionRepository } from "@/server/repositories/prisma-session-repository";
import type { SessionRepository } from "@/server/repositories/session-repository";

export const SESSION_COOKIE_NAME = "nexustrace_session";
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  expires: Date;
}

export interface SessionCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: SessionCookieOptions): void;
  delete(name: string): void;
}

interface SessionDependencies {
  repository?: SessionRepository;
  cookieStore?: SessionCookieStore;
  now?: () => Date;
  createToken?: () => string;
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function clearSessionCookie(cookieStore: SessionCookieStore): void {
  try {
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Server Components may read cookies but Next.js only permits mutation in actions.
  }
}

async function resolveDependencies(dependencies: SessionDependencies) {
  return {
    repository: dependencies.repository ?? new PrismaSessionRepository(),
    cookieStore:
      dependencies.cookieStore ?? ((await cookies()) as SessionCookieStore),
    now: dependencies.now ?? (() => new Date()),
    createToken:
      dependencies.createToken ?? (() => randomBytes(32).toString("base64url")),
  };
}

export async function createSession(
  userId: string,
  dependencies: SessionDependencies = {},
): Promise<void> {
  const { repository, cookieStore, now, createToken } =
    await resolveDependencies(dependencies);
  const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existingToken) {
    await repository.deleteByTokenHash(hashSessionToken(existingToken));
  }

  const token = createToken();
  const expiresAt = new Date(now().getTime() + SESSION_DURATION_MS);

  await repository.create({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentActor(
  dependencies: SessionDependencies = {},
): Promise<Actor | null> {
  const { repository, cookieStore, now } = await resolveDependencies(dependencies);
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await repository.findByTokenHash(tokenHash);

  if (!session) {
    clearSessionCookie(cookieStore);
    return null;
  }

  if (session.expiresAt <= now() || !session.user.active) {
    await repository.deleteByTokenHash(tokenHash);
    clearSessionCookie(cookieStore);
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role,
    departmentId: session.user.departmentId,
  };
}

export async function destroyCurrentSession(
  dependencies: SessionDependencies = {},
): Promise<void> {
  const { repository, cookieStore } = await resolveDependencies(dependencies);
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await repository.deleteByTokenHash(hashSessionToken(token));
  }

  clearSessionCookie(cookieStore);
}
