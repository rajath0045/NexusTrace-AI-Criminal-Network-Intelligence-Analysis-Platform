import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaseOverview } from "@/features/cases/case-overview";
import { getCurrentActor } from "@/server/auth/session";
import { getCase } from "@/server/services/case-service";

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  let record;
  try {
    record = await getCase(actor, (await params).caseId);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="page-stack">
      <Link className="back-link" href="/cases">← Back to cases</Link>
      <header className="page-header"><div><p className="eyebrow">{record.firNumber} / {record.caseNumber}</p><h1>{record.title}</h1><p>{record.departmentName}</p></div></header>
      <CaseOverview record={record} />
    </div>
  );
}
