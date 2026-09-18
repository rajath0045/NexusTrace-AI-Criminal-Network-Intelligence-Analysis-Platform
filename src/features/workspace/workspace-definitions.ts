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

const incidentsWidgets: readonly WorkspaceWidgetDefinition[] = [
  { id: "incident-register", label: "Incident register", size: "lg", capability: "CASE_VIEW" },
  { id: "review-queue", label: "Review queue", size: "wide", capability: "INCIDENT_REVIEW" },
  { id: "submit-incident", label: "Submit incident observation", size: "sm", capability: "INCIDENT_SUBMIT" },
  { id: "create-incident", label: "Create incident", size: "sm", capability: "INCIDENT_CREATE" },
];

const incidentDetailWidgets: readonly WorkspaceWidgetDefinition[] = [
  { id: "incident-summary", label: "Incident summary", size: "wide", capability: "CASE_VIEW" },
  { id: "incident-people", label: "People involved", size: "wide", capability: "CASE_VIEW" },
  { id: "incident-evidence", label: "Supporting evidence", size: "wide", capability: "CASE_VIEW" },
  { id: "incident-timeline", label: "Investigation timeline", size: "lg", capability: "CASE_VIEW" },
  { id: "incident-audit", label: "Audit activity", size: "wide", capability: "CASE_VIEW" },
  { id: "incident-review", label: "Review and provenance", size: "wide", capability: "INCIDENT_REVIEW" },
];

const investigationWidgets: readonly WorkspaceWidgetDefinition[] = [
  { id: "investigation-context", label: "Investigation context", size: "wide", capability: "INVESTIGATION_ANALYZE" },
  { id: "investigation-timeline", label: "Unified timeline", size: "lg", capability: "INVESTIGATION_ANALYZE" },
  { id: "communication-changes", label: "Communication changes", size: "wide", capability: "INVESTIGATION_ANALYZE" },
  { id: "financial-changes", label: "Financial changes", size: "wide", capability: "INVESTIGATION_ANALYZE" },
  { id: "network-changes", label: "Network changes", size: "wide", capability: "INVESTIGATION_ANALYZE" },
  { id: "cross-case-links", label: "Cross-case context", size: "wide", capability: "INVESTIGATION_ANALYZE" },
  { id: "investigation-findings", label: "Review leads", size: "lg", capability: "INVESTIGATION_ANALYZE" },
  { id: "investigation-copilot", label: "Investigation copilot", size: "wide", capability: "INVESTIGATION_ANALYZE" },
];

export const workspaceWidgetDefinitions: Readonly<
  Record<WorkspaceKey, readonly WorkspaceWidgetDefinition[]>
> = {
  dashboard: dashboardWidgets,
  cases: casesWidgets,
  graph: graphWidgets,
  incidents: incidentsWidgets,
  "incident-detail": incidentDetailWidgets,
  investigation: investigationWidgets,
};
