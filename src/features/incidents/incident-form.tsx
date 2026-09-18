"use client";

import { useActionState } from "react";
import { IncidentParticipation, IncidentType } from "@/domain/model";
import type { CaseSummary } from "@/domain/case";
import type { PersonReference } from "@/domain/person";
import type { IncidentEntityReference } from "@/domain/incident";

export interface IncidentFormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

type IncidentAction = (previousState: IncidentFormState, formData: FormData) => Promise<IncidentFormState>;

function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }

export function IncidentForm({ action, cases, people, entities, evidence, submitLabel }: {
  action: IncidentAction;
  cases: CaseSummary[];
  people: PersonReference[];
  evidence: ReadonlyArray<{ id: string; originalFilename: string; caseId: string }>;
  entities: IncidentEntityReference[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  return <form className="record-form" action={formAction} noValidate>
    <div className="form-grid">
      <div className="field-group"><label htmlFor="incidentNumber">Incident number</label><input id="incidentNumber" name="incidentNumber" required aria-invalid={Boolean(error("incidentNumber"))} placeholder="INC-108" />{error("incidentNumber") ? <p className="field-error">{error("incidentNumber")}</p> : null}</div>
      <div className="field-group"><label htmlFor="incidentType">Incident type</label><select id="incidentType" name="incidentType" defaultValue={IncidentType.SuspiciousEvent}>{Object.values(IncidentType).map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></div>
      <div className="field-group form-span-2"><label htmlFor="title">Title</label><input id="title" name="title" required aria-invalid={Boolean(error("title"))} />{error("title") ? <p className="field-error">{error("title")}</p> : null}</div>
      <div className="field-group"><label htmlFor="occurredAt">Date and time</label><input id="occurredAt" name="occurredAt" type="datetime-local" required aria-invalid={Boolean(error("occurredAt"))} />{error("occurredAt") ? <p className="field-error">{error("occurredAt")}</p> : null}</div>
      <div className="field-group"><label htmlFor="location">Location <span className="optional-label">Optional</span></label><input id="location" name="location" maxLength={240} /></div>
      <div className="field-group form-span-2"><label htmlFor="caseId">Related case / FIR <span className="optional-label">Optional</span></label><select id="caseId" name="caseId"><option value="">No case selected</option>{cases.map((record) => <option key={record.id} value={record.id}>{record.firNumber} · {record.title}</option>)}</select></div>
      <div className="field-group"><label htmlFor="participation">Participant role</label><select id="participation" name="participation" defaultValue={IncidentParticipation.Witness}>{Object.values(IncidentParticipation).map((role) => <option key={role} value={role}>{label(role)}</option>)}</select></div>
      <div className="field-group"><label htmlFor="personIds">People involved <span className="optional-label">Optional</span></label><select id="personIds" name="personIds" multiple size={Math.min(4, Math.max(2, people.length))}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></div>
      <div className="field-group form-span-2"><label htmlFor="entityIds">Related network entities <span className="optional-label">Optional</span></label><select id="entityIds" name="entityIds" multiple size={Math.min(4, Math.max(2, entities.length))}>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.entityType.replaceAll("_", " ")} · {entity.displayLabel}</option>)}</select><span className="field-hint">Only entities in your authorized graph scope are listed.</span></div>
      <div className="field-group form-span-2"><label htmlFor="evidenceIds">Supporting evidence <span className="optional-label">Optional</span></label><select id="evidenceIds" name="evidenceIds" multiple size={Math.min(4, Math.max(2, evidence.length))}>{evidence.map((record) => <option key={record.id} value={record.id}>{record.originalFilename}</option>)}</select><span className="field-hint">Only evidence already available within your authorized department is listed.</span></div>
      <div className="field-group form-span-2"><label htmlFor="description">Description</label><textarea id="description" name="description" rows={5} required aria-invalid={Boolean(error("description"))} />{error("description") ? <p className="field-error">{error("description")}</p> : null}</div>
    </div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <div className="form-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button></div>
  </form>;
}
