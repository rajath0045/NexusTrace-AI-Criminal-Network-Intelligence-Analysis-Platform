// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import { WORKSPACE_LAYOUT_VERSION } from "@/domain/workspace";
import type {
  SaveWorkspaceLayoutRecord,
  StoredWorkspaceLayout,
  WorkspaceLayoutRepository,
} from "@/server/repositories/workspace-layout-repository";
import { WorkspaceLayoutService } from "./workspace-layout-service";

const administrator: Actor = {
  userId: "20000000-0000-4000-8000-000000000001",
  email: "admin@nexustrace.demo",
  displayName: "Aditi Rao",
  role: UserRole.Administrator,
  departmentId: "10000000-0000-4000-8000-000000000001",
};

const departmentUser: Actor = {
  userId: "20000000-0000-4000-8000-000000000002",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "10000000-0000-4000-8000-000000000002",
};

const investigator: Actor = {
  userId: "20000000-0000-4000-8000-000000000003",
  email: "investigator@nexustrace.demo",
  displayName: "Ishaan Sen",
  role: UserRole.Investigator,
  departmentId: "10000000-0000-4000-8000-000000000003",
};

class MemoryWorkspaceLayoutRepository implements WorkspaceLayoutRepository {
  records = new Map<string, StoredWorkspaceLayout>();

  private key(userId: string, workspaceKey: string) {
    return `${userId}:${workspaceKey}`;
  }

  async findByUserAndWorkspace(userId: string, workspaceKey: string) {
    return this.records.get(this.key(userId, workspaceKey)) ?? null;
  }

  async upsert(record: SaveWorkspaceLayoutRecord) {
    const stored: StoredWorkspaceLayout = {
      ...record,
      id: this.records.get(this.key(record.userId, record.workspaceKey))?.id ??
        crypto.randomUUID(),
      updatedAt: new Date(),
    };
    this.records.set(this.key(record.userId, record.workspaceKey), stored);
    return stored;
  }

  async deleteByUserAndWorkspace(userId: string, workspaceKey: string) {
    this.records.delete(this.key(userId, workspaceKey));
  }
}

describe("WorkspaceLayoutService", () => {
  it("uses role-aware defaults when a user has no saved preference", async () => {
    const service = new WorkspaceLayoutService(
      new MemoryWorkspaceLayoutRepository(),
    );

    const adminLayout = await service.getLayout(administrator, "dashboard");
    const investigatorLayout = await service.getLayout(
      investigator,
      "dashboard",
    );

    expect(adminLayout.items.map((item) => item.id)).toContain("register-case");
    expect(investigatorLayout.items.map((item) => item.id)).not.toContain(
      "register-case",
    );
  });

  it("keeps saved arrangements isolated by authenticated user", async () => {
    const repository = new MemoryWorkspaceLayoutRepository();
    const service = new WorkspaceLayoutService(repository);
    const defaultLayout = await service.getLayout(administrator, "cases");
    const reversed = [...defaultLayout.items].reverse();

    await service.saveLayout(administrator, "cases", reversed);

    expect(
      (await service.getLayout(administrator, "cases")).items.map(
        (item) => item.id,
      ),
    ).toEqual(reversed.map((item) => item.id));
    expect(
      (await service.getLayout(departmentUser, "cases")).items.map(
        (item) => item.id,
      ),
    ).not.toEqual(reversed.map((item) => item.id));
  });

  it("filters unauthorized and stale widget ids before saving", async () => {
    const service = new WorkspaceLayoutService(
      new MemoryWorkspaceLayoutRepository(),
    );

    const saved = await service.saveLayout(investigator, "dashboard", [
      { id: "register-case", label: "Forged action", size: "lg" },
      { id: "removed-widget", label: "Stale", size: "wide" },
      { id: "access-scope", label: "Client-supplied label", size: "lg" },
    ]);

    expect(saved.items.map((item) => item.id)).toEqual([
      "access-scope",
      "case-status",
      "recent-investigations",
    ]);
    expect(saved.items[0]).toEqual({
      id: "access-scope",
      label: "Authorized access scope",
      size: "lg",
    });
  });

  it("falls back to defaults for unsupported saved versions", async () => {
    const repository = new MemoryWorkspaceLayoutRepository();
    repository.records.set(`${administrator.userId}:dashboard`, {
      id: crypto.randomUUID(),
      userId: administrator.userId,
      workspaceKey: "dashboard",
      version: WORKSPACE_LAYOUT_VERSION + 1,
      layoutJson: {
        version: WORKSPACE_LAYOUT_VERSION + 1,
        items: [{ id: "unknown", label: "Unknown", size: "lg" }],
      },
      updatedAt: new Date(),
    });
    const service = new WorkspaceLayoutService(repository);

    const layout = await service.getLayout(administrator, "dashboard");

    expect(layout.version).toBe(WORKSPACE_LAYOUT_VERSION);
    expect(layout.items.map((item) => item.id)).toEqual([
      "case-status",
      "access-scope",
      "register-case",
      "recent-investigations",
    ]);
  });

  it("deletes a saved preference when resetting to role defaults", async () => {
    const repository = new MemoryWorkspaceLayoutRepository();
    const service = new WorkspaceLayoutService(repository);
    const defaults = await service.getLayout(departmentUser, "cases");
    await service.saveLayout(departmentUser, "cases", [
      ...defaults.items.slice(1),
      defaults.items[0],
    ]);

    const reset = await service.resetLayout(departmentUser, "cases");

    expect(reset.items).toEqual(defaults.items);
    expect(
      await repository.findByUserAndWorkspace(departmentUser.userId, "cases"),
    ).toBeNull();
  });
});
