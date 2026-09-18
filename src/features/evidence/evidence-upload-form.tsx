"use client";

import { useActionState } from "react";
import type { AttachEvidenceState } from "@/app/(protected)/cases/[caseId]/evidence/actions";

type AttachEvidenceAction = (
  previousState: AttachEvidenceState,
  formData: FormData,
) => Promise<AttachEvidenceState>;

export function EvidenceUploadForm({
  action,
  caseId,
}: {
  action: AttachEvidenceAction;
  caseId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="record-form compact-form">
      <input name="caseId" type="hidden" value={caseId} />
      <div className="form-grid">
        <div className="field-group form-span-2">
          <label htmlFor="evidenceFile">Evidence file</label>
          <input
            accept=".csv,.jpeg,.jpg,.pdf,.png,.txt,application/pdf,image/jpeg,image/png,text/csv,text/plain"
            aria-describedby="evidenceFileHint"
            aria-invalid={Boolean(state.fieldErrors?.file)}
            id="evidenceFile"
            name="file"
            required
            type="file"
          />
          <span className="field-hint" id="evidenceFileHint">PDF, JPEG, PNG, CSV, or plain text. Maximum 10 MB.</span>
          {state.fieldErrors?.file?.map((error) => <p className="field-error" key={error}>{error}</p>)}
        </div>
        <div className="field-group form-span-2">
          <label htmlFor="evidenceDescription">Description <span className="optional-label">Optional</span></label>
          <textarea id="evidenceDescription" maxLength={1000} name="description" rows={3} />
          {state.fieldErrors?.description?.map((error) => <p className="field-error" key={error}>{error}</p>)}
        </div>
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-success" role="status">Evidence attached and ready for authenticated retrieval.</p> : null}
      <div className="form-actions">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Securing evidence…" : "Attach evidence"}
        </button>
      </div>
    </form>
  );
}
