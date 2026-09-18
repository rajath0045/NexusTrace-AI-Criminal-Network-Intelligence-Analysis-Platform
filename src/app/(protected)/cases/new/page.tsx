import Link from "next/link";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { CaseForm } from "@/features/cases/case-form";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { createCaseAction } from "../actions";

export default async function NewCasePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  if (!can(actor, "CASE_CREATE")) {
    return <ErrorState title="Case creation unavailable" description="Your role can review authorized cases but cannot register a new FIR." />;
  }

  return (
    <div className="page-stack narrow-page">
      <Link className="back-link" href="/cases">← Back to cases</Link>
      <header className="page-header"><div><p className="eyebrow">New investigation record</p><h1>Register case</h1><p>The record will be owned by your department and logged to the audit trail.</p></div></header>
      <section className="record-panel"><CaseForm action={createCaseAction} /></section>
    </div>
  );
}
