import {
  WORKSPACE_LAYOUT_VERSION,
  workspaceLayoutItemSchema,
  workspaceLayoutSchema,
  type WorkspaceLayout,
  type WorkspaceLayoutItem,
} from "@/domain/workspace";
import { z } from "zod";

const legacyLayoutSchema = z.object({
  items: z.array(workspaceLayoutItemSchema).max(32),
});

export function migrateWorkspaceLayout(
  value: unknown,
  storedVersion: number,
): WorkspaceLayout | null {
  if (storedVersion === WORKSPACE_LAYOUT_VERSION) {
    const parsed = workspaceLayoutSchema.safeParse(value);
    return parsed.success && parsed.data.version === WORKSPACE_LAYOUT_VERSION
      ? parsed.data
      : null;
  }

  if (storedVersion === 0) {
    const parsed = legacyLayoutSchema.safeParse(value);
    if (!parsed.success) return null;
    return {
      version: WORKSPACE_LAYOUT_VERSION,
      items: parsed.data.items as WorkspaceLayoutItem[],
    };
  }

  return null;
}
