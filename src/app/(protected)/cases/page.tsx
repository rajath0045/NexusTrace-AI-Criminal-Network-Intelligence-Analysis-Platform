import Link from "next/link";
import { redirect } from "next/navigation";
import { CaseTable } from "@/features/cases/case-table";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { listCases } from "@/server/services/case-service";

export default async function CasesPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const cases = await listCases(actor);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div><p className="eyebrow">Authorized records</p><h1>Cases</h1><p>FIRs and investigations available within your access scope.</p></div>
        {can(actor, "CASE_CREATE") ? <Link className="primary-button" href="/cases/new">Register case</Link> : null}
      </header>
      <div className="section-label"><span>{String(cases.length).padStart(2, "0")}</span><h2>Current investigations</h2></div>
      <CaseTable cases={cases} />
    </div>
  );
}
