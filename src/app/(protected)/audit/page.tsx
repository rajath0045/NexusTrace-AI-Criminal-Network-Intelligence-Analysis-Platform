import { redirect } from "next/navigation";
import { AuditConsole } from "@/features/audit/audit-console";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { getAuditOptions, listAuditEvents } from "@/server/services/audit-service";

export default async function AuditPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "ADMINISTER")) redirect("/dashboard");
  const [initialPage, options] = await Promise.all([listAuditEvents(actor), getAuditOptions(actor)]);
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Administrator-only immutable record</p><h1>Global audit trail</h1><p>Review authorized system activity. Audit records are preserved and cannot be changed from this interface.</p></div></header><AuditConsole initialPage={initialPage} options={options} /></div>;
}
