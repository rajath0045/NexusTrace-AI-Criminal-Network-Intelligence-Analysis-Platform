import type { Actor } from "@/domain/auth";
import {
  WORKSPACE_LAYOUT_VERSION,
  workspaceLayoutMutationSchema,
  type WorkspaceKey,
  type WorkspaceLayout,
  type WorkspaceLayoutItem,
} from "@/domain/workspace";
import {
  getAuthorizedWorkspaceWidgets,
  getWorkspaceDefaults,
} from "@/features/workspace/workspace-defaults";
import { migrateWorkspaceLayout } from "@/features/workspace/workspace-migrations";
import { PrismaWorkspaceLayoutRepository } from "@/server/repositories/prisma-workspace-layout-repository";
import type { WorkspaceLayoutRepository } from "@/server/repositories/workspace-layout-repository";

export class WorkspaceLayoutService {
  constructor(private readonly repository: WorkspaceLayoutRepository) {}

  async getLayout(actor: Actor, workspaceKey: WorkspaceKey): Promise<WorkspaceLayout> {
    const defaults = getWorkspaceDefaults(actor, workspaceKey);
    const stored = await this.repository.findByUserAndWorkspace(
      actor.userId,
      workspaceKey,
    );
    if (!stored) return this.asLayout(defaults);

    const migrated = migrateWorkspaceLayout(stored.layoutJson, stored.version);
    if (!migrated) return this.asLayout(defaults);

    return this.asLayout(
      this.normalizeItems(actor, workspaceKey, migrated.items, defaults),
    );
  }

  async saveLayout(
    actor: Actor,
    workspaceKey: WorkspaceKey,
    items: WorkspaceLayoutItem[],
  ): Promise<WorkspaceLayout> {
    const parsed = workspaceLayoutMutationSchema.parse({ workspaceKey, items });
    const defaults = getWorkspaceDefaults(actor, workspaceKey);
    const normalized = this.normalizeItems(
      actor,
      workspaceKey,
      parsed.items,
      defaults,
    );
    const layout = this.asLayout(normalized);

    await this.repository.upsert({
      userId: actor.userId,
      workspaceKey,
      version: WORKSPACE_LAYOUT_VERSION,
      layoutJson: layout,
    });

    return layout;
  }

  async resetLayout(
    actor: Actor,
    workspaceKey: WorkspaceKey,
  ): Promise<WorkspaceLayout> {
    await this.repository.deleteByUserAndWorkspace(actor.userId, workspaceKey);
    return this.asLayout(getWorkspaceDefaults(actor, workspaceKey));
  }

  private normalizeItems(
    actor: Actor,
    workspaceKey: WorkspaceKey,
    candidateItems: WorkspaceLayoutItem[],
    defaults: WorkspaceLayoutItem[],
  ): WorkspaceLayoutItem[] {
    const authorized = getAuthorizedWorkspaceWidgets(actor, workspaceKey);
    const authorizedById = new Map(authorized.map((widget) => [widget.id, widget]));
    const seen = new Set<string>();
    const normalized: WorkspaceLayoutItem[] = [];

    for (const item of candidateItems) {
      const definition = authorizedById.get(item.id);
      if (!definition || seen.has(item.id)) continue;
      seen.add(item.id);
      normalized.push({
        id: definition.id,
        label: definition.label,
        size: item.size,
      });
    }

    for (const item of defaults) {
      if (!seen.has(item.id)) normalized.push(item);
    }

    return normalized;
  }

  private asLayout(items: WorkspaceLayoutItem[]): WorkspaceLayout {
    return { version: WORKSPACE_LAYOUT_VERSION, items };
  }
}

const workspaceLayoutService = new WorkspaceLayoutService(
  new PrismaWorkspaceLayoutRepository(),
);

export const getWorkspaceLayout =
  workspaceLayoutService.getLayout.bind(workspaceLayoutService);
export const saveWorkspaceLayout =
  workspaceLayoutService.saveLayout.bind(workspaceLayoutService);
export const resetWorkspaceLayout =
  workspaceLayoutService.resetLayout.bind(workspaceLayoutService);
