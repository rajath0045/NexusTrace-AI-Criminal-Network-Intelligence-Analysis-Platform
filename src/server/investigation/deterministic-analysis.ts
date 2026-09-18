import type { InvestigationAnalysis, InvestigationFinding, InvestigationMetric } from "@/domain/investigation";
import type { TimelineItem } from "@/domain/incident";
import { FindingReviewStatus, IncidentVerificationLevel } from "@/domain/model";
import type { InvestigationActivityRecord, InvestigationContextData } from "@/server/repositories/investigation-repository";

const day = 86_400_000;
const notice = "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED" as const;

function inRange(time: Date, start: Date, end: Date) {
  return time >= start && time <= end;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[midpoint - 1]! + sorted[midpoint]!) / 2 : sorted[midpoint]!;
}

function levels(records: Array<{ verificationLevel: string }>) {
  return [...new Set(records.map((record) => record.verificationLevel as IncidentVerificationLevel))];
}

function evidence(records: Array<{ sourceEvidenceId: string | null; verificationLevel: string }>) {
  const refs = new Map<string, IncidentVerificationLevel>();
  for (const record of records) if (record.sourceEvidenceId) refs.set(record.sourceEvidenceId, record.verificationLevel as IncidentVerificationLevel);
  return [...refs].map(([id, verificationLevel]) => ({ id, verificationLevel }));
}

function lead(category: InvestigationFinding["category"], id: string, title: string, detail: string, records: Array<{ id: string; sourceEvidenceId: string | null; verificationLevel: string }>): InvestigationFinding {
  return { id, category, title, detail, status: notice, supportingRecordIds: records.map((record) => record.id), evidence: evidence(records), verificationLevels: levels(records), reviewStatus: FindingReviewStatus.Unreviewed };
}

function counterpart(record: InvestigationActivityRecord, personEntityIds: string[]) {
  return personEntityIds.includes(record.sourceEntityId)
    ? { id: record.destinationEntityId, label: record.destinationLabel }
    : { id: record.sourceEntityId, label: record.sourceLabel };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function buildDeterministicAnalysis(data: InvestigationContextData, beforeDays: number, afterDays: number): InvestigationAnalysis {
  const startTime = new Date(data.incident.occurredAt.getTime() - beforeDays * day);
  const endTime = new Date(data.incident.occurredAt.getTime() + afterDays * day);
  const baselineStartTime = new Date(startTime.getTime() - beforeDays * day);
  const baselineEndTime = new Date(startTime.getTime() - 1);
  const current = data.activities.filter((record) => inRange(record.occurredAt, startTime, endTime));
  const baseline = data.activities.filter((record) => inRange(record.occurredAt, baselineStartTime, baselineEndTime));
  const currentCommunications = current.filter((record) => record.kind === "COMMUNICATION");
  const baselineCommunications = baseline.filter((record) => record.kind === "COMMUNICATION");
  const currentFinance = current.filter((record) => record.kind === "FINANCIAL");
  const baselineFinance = baseline.filter((record) => record.kind === "FINANCIAL");
  const findings: InvestigationFinding[] = [];
  const communicationMetrics: InvestigationMetric[] = [
    { label: "Window communications", value: String(currentCommunications.length), detail: `${beforeDays} days before through ${afterDays} days after the incident.` },
    { label: "Baseline communications", value: String(baselineCommunications.length), detail: `Prior ${beforeDays}-day comparison window.` },
  ];
  if (baselineCommunications.length > 0 && currentCommunications.length >= 6 && currentCommunications.length >= baselineCommunications.length * 3) {
    findings.push(lead("COMMUNICATION", "communication-spike", "Communication volume changed materially", `${currentCommunications.length} authorized communication records fall in the incident window compared with ${baselineCommunications.length} in the preceding comparable window. Frequency is not evidence of criminal involvement.`, currentCommunications));
  }
  const knownContacts = new Set(baselineCommunications.map((record) => counterpart(record, data.person.entityIds).id));
  const newContactRecords = currentCommunications.filter((record) => !knownContacts.has(counterpart(record, data.person.entityIds).id));
  if (newContactRecords.length) {
    const labels = [...new Set(newContactRecords.map((record) => counterpart(record, data.person.entityIds).label))];
    findings.push(lead("COMMUNICATION", "new-contact", "New contact in selected time window", `${labels.join(", ")} did not appear in the preceding comparable communication window. This is a temporal observation, not an attribution of conduct.`, newContactRecords));
  }
  const baselineAmounts = baselineFinance.flatMap((record) => record.amount === undefined ? [] : [record.amount]);
  const currentAmounts = currentFinance.flatMap((record) => record.amount === undefined ? [] : [record.amount]);
  const baselineMedian = median(baselineAmounts);
  const largest = currentFinance.reduce<InvestigationActivityRecord | null>((max, record) => !max || (record.amount ?? 0) > (max.amount ?? 0) ? record : max, null);
  const currency = largest?.currency ?? "INR";
  const financialMetrics: InvestigationMetric[] = [
    { label: "Window transactions", value: String(currentFinance.length), detail: `Total ${formatCurrency(currentAmounts.reduce((total, amount) => total + amount, 0), currency)}.` },
    { label: "Baseline median", value: baselineMedian === null ? "No comparable activity" : formatCurrency(baselineMedian, currency), detail: `Prior ${beforeDays}-day comparison window.` },
  ];
  if (largest && baselineMedian !== null && (largest.amount ?? 0) >= baselineMedian * 3) {
    findings.push(lead("FINANCIAL", "financial-volume", "Transaction exceeds recent baseline", `${formatCurrency(largest.amount ?? 0, largest.currency ?? "INR")} is at least three times the ${formatCurrency(baselineMedian, largest.currency ?? "INR")} median of the preceding comparable window. Amount alone does not establish unlawful activity.`, [largest]));
  }
  const knownFinanceContacts = new Set(baselineFinance.map((record) => counterpart(record, data.person.entityIds).id));
  const newFinanceContacts = currentFinance.filter((record) => !knownFinanceContacts.has(counterpart(record, data.person.entityIds).id));
  if (newFinanceContacts.length) findings.push(lead("FINANCIAL", "new-financial-counterparty", "New financial counterparty in selected time window", `${[...new Set(newFinanceContacts.map((record) => counterpart(record, data.person.entityIds).label))].join(", ")} has no corresponding financial activity in the preceding comparable window.`, newFinanceContacts));

  const newRelationships = data.relationships.filter((record) => inRange(record.occurredAt, startTime, endTime));
  const networkMetrics: InvestigationMetric[] = [
    { label: "Observed relationship changes", value: String(newRelationships.length), detail: "Existing graph relationships first/last observed in the selected window." },
  ];
  if (newRelationships.length) findings.push({ id: "network-change", category: "NETWORK", title: "Network relationship observed in selected window", detail: `${newRelationships.map((record) => record.relationshipType).join(", ")} is represented by the authorized graph data in this time window. Relationship presence does not establish criminal involvement.`, status: notice, supportingRecordIds: newRelationships.map((record) => record.id), evidence: newRelationships.flatMap((record) => record.evidenceIds.map((id) => ({ id, verificationLevel: record.verificationLevel as IncidentVerificationLevel }))), verificationLevels: levels(newRelationships), reviewStatus: FindingReviewStatus.Unreviewed });

  const casesByCounterpart = new Map<string, { label: string; caseIds: Set<string>; records: InvestigationActivityRecord[] }>();
  for (const record of data.activities) {
    if (!record.caseId) continue;
    const contact = counterpart(record, data.person.entityIds);
    const entry = casesByCounterpart.get(contact.id) ?? { label: contact.label, caseIds: new Set<string>(), records: [] };
    entry.caseIds.add(record.caseId); entry.records.push(record); casesByCounterpart.set(contact.id, entry);
  }
  const shared = [...casesByCounterpart.values()].filter((entry) => entry.caseIds.size > 1);
  const crossCaseMetrics: InvestigationMetric[] = [{ label: "Shared authorized entities", value: String(shared.length), detail: "Entities appearing in activity linked to more than one authorized case." }];
  for (const entry of shared) findings.push(lead("CROSS_CASE", `cross-case:${entry.label}`, "Cross-case entity context", `${entry.label} appears in ${entry.caseIds.size} authorized case contexts through recorded activity. This is a review lead, not a finding of culpability.`, entry.records));

  const timeline: TimelineItem[] = current.map((record) => ({ id: `${record.kind.toLowerCase()}:${record.id}`, type: record.kind, timestamp: record.occurredAt, title: record.kind === "COMMUNICATION" ? `Communication: ${record.subtype.replaceAll("_", " ")}` : `Financial activity: ${record.subtype.replaceAll("_", " ")}`, description: record.kind === "FINANCIAL" ? `${formatCurrency(record.amount ?? 0, record.currency ?? "INR")} · ${record.sourceLabel} → ${record.destinationLabel}` : `${record.sourceLabel} → ${record.destinationLabel}`, sourceRecordType: record.kind, sourceRecordId: record.id, caseId: record.caseId, incidentId: record.incidentId, personIds: [data.person.id], evidenceId: record.sourceEvidenceId }));
  return { person: { id: data.person.id, displayName: data.person.displayName }, incident: data.incident, window: { startTime, endTime, baselineStartTime, baselineEndTime, beforeDays, afterDays }, timeline: timeline.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime()), findings, communicationMetrics, financialMetrics, networkMetrics, crossCaseMetrics };
}
