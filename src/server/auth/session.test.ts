// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import {
  createSession,
  getCurrentActor,
  SESSION_COOKIE_NAME,
  type SessionCookieStore,
} from "./session";
import type {
  PersistedSession,
  SessionRepository,
} from "@/server/repositories/session-repository";

function createCookieStore(initialToken?: string) {
  const values = new Map<string, string>();
  if (initialToken) values.set(SESSION_COOKIE_NAME, initialToken);

  const store: SessionCookieStore = {
    get: vi.fn((name: string) => {
      const value = values.get(name);
      return value ? { value } : undefined;
    }),
    set: vi.fn((name: string, value: string) => {
      values.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      values.delete(name);
    }),
  };

  return { store, values };
}

function createRepository(session: PersistedSession | null = null) {
  const repository: SessionRepository = {
    create: vi.fn(async (input) => ({
      id: "session-1",
      ...input,
      user: {
        id: input.userId,
        email: "department@nexustrace.demo",
        displayName: "Dev Malhotra",
        role: UserRole.DepartmentUser,
        departmentId: "cyber-crime",
        active: true,
      },
    })),
    findByTokenHash: vi.fn(async () => session),
    deleteByTokenHash: vi.fn(async () => undefined),
  };

  return repository;
}

describe("database-backed sessions", () => {
  it("stores only a token hash while placing the opaque token in an HttpOnly cookie", async () => {
    const repository = createRepository();
    const { store, values } = createCookieStore();

    await createSession("user-1", { repository, cookieStore: store });

    const opaqueToken = values.get(SESSION_COOKIE_NAME);
    const createCall = vi.mocked(repository.create).mock.calls[0]?.[0];

    expect(opaqueToken).toBeTruthy();
    expect(createCall?.tokenHash).not.toBe(opaqueToken);
    expect(createCall?.tokenHash).toBe(
      createHash("sha256").update(opaqueToken ?? "").digest("hex"),
    );
    expect(store.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      opaqueToken,
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("rejects and removes an expired session", async () => {
    const rawToken = "expired-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const session: PersistedSession = {
      id: "session-1",
      tokenHash,
      userId: "user-1",
      expiresAt: new Date("2026-09-18T08:00:00.000Z"),
      user: {
        id: "user-1",
        email: "department@nexustrace.demo",
        displayName: "Dev Malhotra",
        role: UserRole.DepartmentUser,
        departmentId: "cyber-crime",
        active: true,
      },
    };
    const repository = createRepository(session);
    const { store } = createCookieStore(rawToken);

    await expect(
      getCurrentActor({
        repository,
        cookieStore: store,
        now: () => new Date("2026-09-18T09:00:00.000Z"),
      }),
    ).resolves.toBeNull();
    expect(repository.deleteByTokenHash).toHaveBeenCalledWith(tokenHash);
    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("resolves an active, unexpired session to an actor", async () => {
    const rawToken = "active-token";
    const session: PersistedSession = {
      id: "session-1",
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      userId: "user-1",
      expiresAt: new Date("2026-09-18T20:00:00.000Z"),
      user: {
        id: "user-1",
        email: "department@nexustrace.demo",
        displayName: "Dev Malhotra",
        role: UserRole.DepartmentUser,
        departmentId: "cyber-crime",
        active: true,
      },
    };

    await expect(
      getCurrentActor({
        repository: createRepository(session),
        cookieStore: createCookieStore(rawToken).store,
        now: () => new Date("2026-09-18T09:00:00.000Z"),
      }),
    ).resolves.toMatchObject({
      userId: "user-1",
      role: UserRole.DepartmentUser,
      departmentId: "cyber-crime",
    });
  });

  it("revokes sessions belonging to inactive users", async () => {
    const rawToken = "inactive-user-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const session: PersistedSession = {
      id: "session-2",
      tokenHash,
      userId: "user-2",
      expiresAt: new Date("2026-09-18T20:00:00.000Z"),
      user: {
        id: "user-2",
        email: "inactive@nexustrace.demo",
        displayName: "Inactive Operator",
        role: UserRole.Investigator,
        departmentId: "financial-intelligence",
        active: false,
      },
    };
    const repository = createRepository(session);
    const { store } = createCookieStore(rawToken);

    await expect(
      getCurrentActor({
        repository,
        cookieStore: store,
        now: () => new Date("2026-09-18T09:00:00.000Z"),
      }),
    ).resolves.toBeNull();
    expect(repository.deleteByTokenHash).toHaveBeenCalledWith(tokenHash);
  });
});
