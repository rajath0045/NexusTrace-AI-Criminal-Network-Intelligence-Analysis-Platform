"use client";

import { useActionState } from "react";
import { CaseParticipation } from "@/domain/model";
import type { PersonReference } from "@/domain/person";
import type { AssociatePersonState } from "@/app/(protected)/cases/[caseId]/people/actions";

type AssociateAction = (
  previousState: AssociatePersonState,
  formData: FormData,
) => Promise<AssociatePersonState>;

function labelForParticipation(value: CaseParticipation): string {
  return value[0] + value.slice(1).toLowerCase();
}

export function CasePersonForm({
  action,
  candidates,
  caseId,
}: {
  action: AssociateAction;
  candidates: PersonReference[];
  caseId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  if (candidates.length === 0) {
    return <p className="muted-copy">No reusable person profiles are available within your authorized case scope.</p>;
  }

  return (
    <form action={formAction} className="record-form compact-form">
      <input name="caseId" type="hidden" value={caseId} />
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="personId">Canonical person</label>
          <select aria-invalid={Boolean(state.fieldErrors?.personId)} id="personId" name="personId" required>
            <option value="">Select a profile</option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}{person.aliases.length > 0 ? ` · ${person.aliases.join(", ")}` : ""}
              </option>
            ))}
          </select>
          {state.fieldErrors?.personId?.map((error) => <p className="field-error" key={error}>{error}</p>)}
        </div>
        <div className="field-group">
          <label htmlFor="participation">Case role</label>
          <select aria-invalid={Boolean(state.fieldErrors?.participation)} id="participation" name="participation" required>
            {Object.values(CaseParticipation).map((role) => (
              <option key={role} value={role}>{labelForParticipation(role)}</option>
            ))}
          </select>
          {state.fieldErrors?.participation?.map((error) => <p className="field-error" key={error}>{error}</p>)}
        </div>
        <div className="field-group form-span-2">
          <label htmlFor="notes">Participation notes <span className="optional-label">Optional</span></label>
          <textarea id="notes" name="notes" rows={3} maxLength={1000} />
        </div>
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-success" role="status">Profile associated with this case.</p> : null}
      <div className="form-actions">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Associating…" : "Associate profile"}
        </button>
      </div>
    </form>
  );
}
