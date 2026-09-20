import { redirect } from "next/navigation";
import { ReportsConsole } from "@/features/reports/reports-console";
import { getCurrentActor } from "@/server/auth/session";
import { listCases } from "@/server/services/case-service";
import { listReports } from "@/server/services/report-service";
export default async function ReportsPage() { const actor = await getCurrentActor(); if (!actor) redirect("/login"); const [cases, reports] = await Promise.all([listCases(actor), listReports(actor)]); return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Evidence-backed immutable snapshots</p><h1>Reports</h1><p>Deterministic investigation reporting with human-review distinction and traceable provenance.</p></div></header><ReportsConsole cases={cases} initial={reports} /></div>; }
