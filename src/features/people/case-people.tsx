import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CaseParticipant, PersonReference } from "@/domain/person";
import type { AssociatePersonState } from "@/app/(protected)/cases/[caseId]/people/actions";
import { CasePersonForm } from "./case-person-form";

type AssociateAction = (
  previousState: AssociatePersonState,
  formData: FormData,
) => Promise<AssociatePersonState>;

export function CasePeople({
  action,
  candidates,
  caseId,
  people,
}: {
  action?: AssociateAction;
  candidates?: PersonReference[];
  caseId: string;
  people: CaseParticipant[];
}) {
  return (
    <section className="record-panel case-people-panel">
      <div className="panel-heading">
        <div><p className="panel-kicker">Case participation</p><h2>People</h2></div>
        <span className="record-count">{String(people.length).padStart(2, "0")}</span>
      </div>
      {people.length === 0 ? (
        <EmptyState title="No associated people" description="Associate an authorized canonical person profile with this case." />
      ) : (
        <ul className="person-list">
          {people.map((person) => (
            <li key={person.associationId}>
              <div>
                <Link href={`/people/${person.id}`}>{person.displayName}</Link>
                <p>{person.notes ?? "No participation notes recorded."}</p>
              </div>
              <StatusBadge>{person.participation}</StatusBadge>
            </li>
          ))}
        </ul>
      )}
      {action && candidates ? (
        <details className="association-disclosure">
          <summary>Associate canonical profile</summary>
          <CasePersonForm action={action} candidates={candidates} caseId={caseId} />
        </details>
      ) : null}
    </section>
  );
}
