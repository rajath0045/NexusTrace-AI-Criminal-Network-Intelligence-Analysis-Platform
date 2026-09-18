import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceGrid } from "@/features/workspace/workspace-grid";
import {
  AccessScope,
  CaseStatusSummary,
  RecentInvestigations,
  RegisterCaseWidget,
} from "@/features/workspace/case-workspace-widgets";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { listCases } from "@/server/services/case-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const [cases, layout] = await Promise.all([
    listCases(actor),
    getWorkspaceLayout(actor, "dashboard"),
  ]);

  const widgets = [
    {
      id: "case-status",
      content: <CaseStatusSummary cases={cases} />,
    },
    {
      id: "recent-investigations",
      content: <RecentInvestigations cases={cases} />,
    },
    {
      id: "access-scope",
      content: <AccessScope actor={actor} />,
    },
    ...(can(actor, "CASE_CREATE")
      ? [{ id: "register-case", content: <RegisterCaseWidget /> }]
      : []),
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Authenticated workspace</p>
          <h1>Dashboard</h1>
          <p>Authorized case activity and investigation access for this session.</p>
        </div>
        <Link className="secondary-button" href="/cases">
          View all cases
        </Link>
      </header>

      <WorkspaceGrid
        workspaceKey="dashboard"
        initialItems={layout.items}
        widgets={widgets}
        ariaLabel="Authenticated dashboard widgets"
      />
    </div>
  );
}
