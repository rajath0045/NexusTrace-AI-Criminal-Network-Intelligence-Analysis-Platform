import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import type { WorkspaceKey, WorkspaceLayoutItem } from "@/domain/workspace";
import { can } from "@/server/authorization/policy";
import {
  workspaceWidgetDefinitions,
  type WorkspaceWidgetDefinition,
} from "./workspace-definitions";

const roleOrder: Readonly<
  Record<UserRole, Readonly<Record<WorkspaceKey, readonly string[]>>>
> = {
  [UserRole.Administrator]: {
    dashboard: [
      "case-status",
      "access-scope",
      "register-case",
      "recent-investigations",
    ],
    cases: [
      "current-investigations",
      "case-status",
      "register-case",
      "recently-updated",
    ],
    graph: ["entity-details", "connection-details", "supporting-evidence"],
  },
  [UserRole.DepartmentUser]: {
    dashboard: [
      "case-status",
      "register-case",
      "access-scope",
      "recent-investigations",
    ],
    cases: [
      "current-investigations",
      "case-status",
      "register-case",
      "recently-updated",
    ],
    graph: ["entity-details", "connection-details", "supporting-evidence"],
  },
  [UserRole.Investigator]: {
    dashboard: ["case-status", "access-scope", "recent-investigations"],
    cases: ["current-investigations", "case-status", "recently-updated"],
    graph: ["entity-details", "connection-details", "supporting-evidence"],
  },
};

export function getAuthorizedWorkspaceWidgets(
  actor: Actor,
  workspaceKey: WorkspaceKey,
): WorkspaceWidgetDefinition[] {
  return workspaceWidgetDefinitions[workspaceKey].filter((widget) =>
    can(actor, widget.capability),
  );
}

export function getWorkspaceDefaults(
  actor: Actor,
  workspaceKey: WorkspaceKey,
): WorkspaceLayoutItem[] {
  const authorized = getAuthorizedWorkspaceWidgets(actor, workspaceKey);
  const byId = new Map(authorized.map((widget) => [widget.id, widget]));

  return roleOrder[actor.role][workspaceKey]
    .map((id) => byId.get(id))
    .filter((widget): widget is WorkspaceWidgetDefinition => Boolean(widget))
    .map(({ id, label, size }) => ({ id, label, size }));
}
