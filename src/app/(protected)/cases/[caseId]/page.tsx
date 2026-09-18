import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaseOverview } from "@/features/cases/case-overview";
import { CaseEvidence } from "@/features/evidence/case-evidence";
import { CasePeople } from "@/features/people/case-people";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { getCase } from "@/server/services/case-service";
import { listCaseEvidence } from "@/server/services/evidence-service";
import { listAssociationCandidates, listCasePeople } from "@/server/services/person-service";
import { attachEvidenceAction } from "./evidence/actions";
import { associatePersonAction } from "./people/actions";

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  let record;
  let people;
  let candidates;
  let evidence;
  try {
    const caseId = (await params).caseId;
    [record, people, candidates, evidence] = await Promise.all([
      getCase(actor, caseId),
      listCasePeople(actor, caseId),
      can(actor, "PERSON_ASSOCIATE") ? listAssociationCandidates(actor, caseId) : Promise.resolve(undefined),
      listCaseEvidence(actor, caseId),
    ]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="page-stack">
      <Link className="back-link" href="/cases">← Back to cases</Link>
      <header className="page-header"><div><p className="eyebrow">{record.firNumber} / {record.caseNumber}</p><h1>{record.title}</h1><p>{record.departmentName}</p></div></header>
      <CaseOverview record={record} />
      <CasePeople
        action={can(actor, "PERSON_ASSOCIATE") ? associatePersonAction : undefined}
        candidates={candidates}
        caseId={record.id}
        people={people}
      />
      <CaseEvidence
        action={can(actor, "EVIDENCE_ATTACH") ? attachEvidenceAction : undefined}
        caseId={record.id}
        evidence={evidence}
      />
    </div>
  );
}
