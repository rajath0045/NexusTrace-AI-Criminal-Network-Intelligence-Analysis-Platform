import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type {
  SaveWorkspaceLayoutRecord,
  WorkspaceLayoutRepository,
} from "./workspace-layout-repository";

export class PrismaWorkspaceLayoutRepository
  implements WorkspaceLayoutRepository
{
  async findByUserAndWorkspace(userId: string, workspaceKey: string) {
    return prisma.userWorkspaceLayout.findUnique({
      where: { userId_workspaceKey: { userId, workspaceKey } },
    });
  }

  async upsert(record: SaveWorkspaceLayoutRecord) {
    const layoutJson = record.layoutJson as Prisma.InputJsonValue;
    return prisma.userWorkspaceLayout.upsert({
      where: {
        userId_workspaceKey: {
          userId: record.userId,
          workspaceKey: record.workspaceKey,
        },
      },
      update: { version: record.version, layoutJson },
      create: {
        userId: record.userId,
        workspaceKey: record.workspaceKey,
        version: record.version,
        layoutJson,
      },
    });
  }

  async deleteByUserAndWorkspace(userId: string, workspaceKey: string) {
    await prisma.userWorkspaceLayout.deleteMany({
      where: { userId, workspaceKey },
    });
  }
}
