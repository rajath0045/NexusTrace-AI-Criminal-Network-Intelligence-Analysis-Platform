// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import { WORKSPACE_LAYOUT_VERSION } from "@/domain/workspace";
import { prisma } from "@/server/db/client";
import { PrismaWorkspaceLayoutRepository } from "@/server/repositories/prisma-workspace-layout-repository";

const administratorId = "20000000-0000-4000-8000-000000000001";
const departmentUserId = "20000000-0000-4000-8000-000000000002";

describe("PrismaWorkspaceLayoutRepository", () => {
  const repository = new PrismaWorkspaceLayoutRepository();

  beforeAll(async () => {
    await seedSyntheticDemoData();
    await prisma.userWorkspaceLayout.deleteMany({
      where: { userId: { in: [administratorId, departmentUserId] } },
    });
  });

  afterAll(async () => {
    await prisma.userWorkspaceLayout.deleteMany({
      where: { userId: { in: [administratorId, departmentUserId] } },
    });
    await prisma.$disconnect();
  });

  it("persists independent layouts for users sharing a workspace key", async () => {
    await repository.upsert({
      userId: administratorId,
      workspaceKey: "cases",
      version: WORKSPACE_LAYOUT_VERSION,
      layoutJson: {
        version: WORKSPACE_LAYOUT_VERSION,
        items: [{ id: "case-status", label: "Case status summary", size: "lg" }],
      },
    });
    await repository.upsert({
      userId: departmentUserId,
      workspaceKey: "cases",
      version: WORKSPACE_LAYOUT_VERSION,
      layoutJson: {
        version: WORKSPACE_LAYOUT_VERSION,
        items: [
          {
            id: "current-investigations",
            label: "Current investigations",
            size: "wide",
          },
        ],
      },
    });

    const [administratorLayout, departmentLayout] = await Promise.all([
      repository.findByUserAndWorkspace(administratorId, "cases"),
      repository.findByUserAndWorkspace(departmentUserId, "cases"),
    ]);

    expect(administratorLayout?.layoutJson).not.toEqual(
      departmentLayout?.layoutJson,
    );
    expect(administratorLayout?.userId).toBe(administratorId);
    expect(departmentLayout?.userId).toBe(departmentUserId);
  });

  it("updates one user and workspace record instead of creating duplicates", async () => {
    await repository.upsert({
      userId: administratorId,
      workspaceKey: "dashboard",
      version: WORKSPACE_LAYOUT_VERSION,
      layoutJson: { version: WORKSPACE_LAYOUT_VERSION, items: [] },
    });
    await repository.upsert({
      userId: administratorId,
      workspaceKey: "dashboard",
      version: WORKSPACE_LAYOUT_VERSION,
      layoutJson: {
        version: WORKSPACE_LAYOUT_VERSION,
        items: [{ id: "case-status", label: "Case status overview", size: "wide" }],
      },
    });

    expect(
      await prisma.userWorkspaceLayout.count({
        where: { userId: administratorId, workspaceKey: "dashboard" },
      }),
    ).toBe(1);
  });
});
