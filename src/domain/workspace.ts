import { z } from "zod";
import type { WidgetItem, WidgetSize } from "@/components/ui/draggable-widget-grid";

export const WORKSPACE_LAYOUT_VERSION = 1;

export const workspaceKeys = ["dashboard", "cases", "graph"] as const;
export type WorkspaceKey = (typeof workspaceKeys)[number];

export interface WorkspaceLayoutItem extends WidgetItem {
  id: string;
  size: WidgetSize;
  label: string;
}

export interface WorkspaceLayout {
  version: number;
  items: WorkspaceLayoutItem[];
}

export const workspaceKeySchema = z.enum(workspaceKeys);
export const widgetSizeSchema = z.enum(["sm", "wide", "tall", "lg"]);

export const workspaceLayoutItemSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    size: widgetSizeSchema,
    label: z.string().trim().min(1).max(120),
  })
  .strict();

export const workspaceLayoutSchema = z
  .object({
    version: z.number().int().positive(),
    items: z.array(workspaceLayoutItemSchema).max(32),
  })
  .strict()
  .superRefine((layout, context) => {
    const ids = new Set<string>();
    for (const item of layout.items) {
      if (ids.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate workspace widget id: ${item.id}`,
          path: ["items"],
        });
      }
      ids.add(item.id);
    }
  });

export const workspaceLayoutMutationSchema = z
  .object({
    workspaceKey: workspaceKeySchema,
    items: z.array(workspaceLayoutItemSchema).max(32),
  })
  .strict()
  .superRefine((mutation, context) => {
    const ids = new Set<string>();
    for (const item of mutation.items) {
      if (ids.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate workspace widget id: ${item.id}`,
          path: ["items"],
        });
      }
      ids.add(item.id);
    }
  });

export type WorkspaceLayoutMutation = z.infer<
  typeof workspaceLayoutMutationSchema
>;
