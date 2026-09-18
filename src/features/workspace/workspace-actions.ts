"use server";

import { AuthorizationError } from "@/domain/auth";
import {
  workspaceKeySchema,
  workspaceLayoutMutationSchema,
  type WorkspaceKey,
  type WorkspaceLayout,
  type WorkspaceLayoutItem,
} from "@/domain/workspace";
import { getCurrentActor } from "@/server/auth/session";
import {
  resetWorkspaceLayout,
  saveWorkspaceLayout,
} from "@/server/services/workspace-layout-service";

async function requireActor() {
  const actor = await getCurrentActor();
  if (!actor) throw new AuthorizationError("Authentication is required.");
  return actor;
}

export async function saveWorkspaceLayoutAction(input: {
  workspaceKey: WorkspaceKey;
  items: WorkspaceLayoutItem[];
}): Promise<WorkspaceLayout> {
  const parsed = workspaceLayoutMutationSchema.parse(input);
  const actor = await requireActor();
  return saveWorkspaceLayout(actor, parsed.workspaceKey, parsed.items);
}

export async function resetWorkspaceLayoutAction(
  workspaceKey: WorkspaceKey,
): Promise<WorkspaceLayout> {
  const parsedKey = workspaceKeySchema.parse(workspaceKey);
  const actor = await requireActor();
  return resetWorkspaceLayout(actor, parsedKey);
}
