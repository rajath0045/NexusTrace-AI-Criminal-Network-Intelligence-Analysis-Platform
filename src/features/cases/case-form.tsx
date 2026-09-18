"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { CreateCaseState } from "@/app/(protected)/cases/actions";

type CreateCaseAction = (
  previousState: CreateCaseState,
  formData: FormData,
) => Promise<CreateCaseState>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register case"}
    </button>
  );
}

export function CaseForm({ action }: { action: CreateCaseAction }) {
  const [state, formAction] = useActionState(action, {});
  const errorFor = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form className="record-form" action={formAction} noValidate>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="firNumber">FIR number</label>
          <input id="firNumber" name="firNumber" required aria-invalid={Boolean(errorFor("firNumber"))} />
          {errorFor("firNumber") ? <p className="field-error">{errorFor("firNumber")}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="caseNumber">Case number</label>
          <input id="caseNumber" name="caseNumber" required aria-invalid={Boolean(errorFor("caseNumber"))} />
          {errorFor("caseNumber") ? <p className="field-error">{errorFor("caseNumber")}</p> : null}
        </div>
        <div className="field-group form-span-2">
          <label htmlFor="title">Case title</label>
          <input id="title" name="title" required aria-invalid={Boolean(errorFor("title"))} />
          {errorFor("title") ? <p className="field-error">{errorFor("title")}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="category">Category</label>
          <input id="category" name="category" required aria-invalid={Boolean(errorFor("category"))} />
          {errorFor("category") ? <p className="field-error">{errorFor("category")}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="occurredAt">Occurrence date and time</label>
          <input id="occurredAt" name="occurredAt" type="datetime-local" aria-invalid={Boolean(errorFor("occurredAt"))} />
          {errorFor("occurredAt") ? <p className="field-error">{errorFor("occurredAt")}</p> : null}
        </div>
        <div className="field-group form-span-2">
          <label htmlFor="occurrenceLocation">Occurrence location</label>
          <input id="occurrenceLocation" name="occurrenceLocation" required aria-invalid={Boolean(errorFor("occurrenceLocation"))} />
          {errorFor("occurrenceLocation") ? <p className="field-error">{errorFor("occurrenceLocation")}</p> : null}
        </div>
        <div className="field-group form-span-2">
          <label htmlFor="description">Investigation summary</label>
          <textarea id="description" name="description" rows={6} required aria-invalid={Boolean(errorFor("description"))} />
          {errorFor("description") ? <p className="field-error">{errorFor("description")}</p> : null}
        </div>
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton />
      </div>
    </form>
  );
}
