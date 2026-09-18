import type { Capability } from "@/domain/auth";
import type { WorkspaceKey, WorkspaceLayoutItem } from "@/domain/workspace";

export interface WorkspaceWidgetDefinition extends WorkspaceLayoutItem {
  capability: Capability;
}

const dashboardWidgets: readonly WorkspaceWidgetDefinition[] = [
  {
    id: "case-status",
    label: "Case status overview",
    size: "wide",
    capability: "CASE_VIEW",
  },
  {
    id: "recent-investigations",
    label: "Recent investigations",
    size: "lg",
    capability: "CASE_VIEW",
  },
  {
    id: "access-scope",
    label: "Authorized access scope",
    size: "sm",
    capability: "CASE_VIEW",
  },
  {
    id: "register-case",
    label: "Register a case",
    size: "sm",
    capability: "CASE_CREATE",
  },
];

const casesWidgets: readonly WorkspaceWidgetDefinition[] = [
  {
    id: "current-investigations",
    label: "Current investigations",
    size: "wide",
    capability: "CASE_VIEW",
  },
  {
    id: "case-status",
    label: "Case status summary",
    size: "wide",
    capability: "CASE_VIEW",
  },
  {
    id: "recently-updated",
    label: "Recently updated cases",
    size: "wide",
    capability: "CASE_VIEW",
  },
  {
    id: "register-case",
    label: "Register a case",
    size: "sm",
    capability: "CASE_CREATE",
  },
];

const graphWidgets: readonly WorkspaceWidgetDefinition[] = [
  { id: "entity-details", label: "Entity details", size: "wide", capability: "CASE_VIEW" },
  { id: "connection-details", label: "Connection details", size: "wide", capability: "CASE_VIEW" },
  { id: "supporting-evidence", label: "Supporting evidence", size: "wide", capability: "CASE_VIEW" },
];

export const workspaceWidgetDefinitions: Readonly<
  Record<WorkspaceKey, readonly WorkspaceWidgetDefinition[]>
> = {
  dashboard: dashboardWidgets,
  cases: casesWidgets,
  graph: graphWidgets,
};
