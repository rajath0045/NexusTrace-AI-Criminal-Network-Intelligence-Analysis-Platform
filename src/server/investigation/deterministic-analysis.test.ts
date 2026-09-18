import { describe, expect, it } from "vitest";
import { IncidentVerificationLevel } from "@/domain/model";
import { buildDeterministicAnalysis } from "./deterministic-analysis";
import type { InvestigationContextData } from "@/server/repositories/investigation-repository";

const personEntity = "60000000-0000-4000-8000-000000000001";
const meeraEntity = "60000000-0000-4000-8000-000000000002";
const deviceEntity = "60000000-0000-4000-8000-000000000010";
const base: InvestigationContextData = {
  person: { id: "40000000-0000-4000-8000-000000000001", displayName: "Arjun Mehta", entityIds: [personEntity] },
  incident: { id: "80000000-0000-4000-8000-000000000001", incidentNumber: "INC-108", title: "Synthetic event", occurredAt: new Date("2026-08-16T12:00:00.000Z"), departmentId: "10000000-0000-4000-8000-000000000002" },
  activities: [], relationships: [],
};
function communication(id: string, date: string, destinationEntityId = meeraEntity, caseId = "case-1") {
  return { id, kind: "COMMUNICATION" as const, subtype: "CALL", occurredAt: new Date(date), sourceEntityId: personEntity, sourceLabel: "Arjun Mehta", destinationEntityId, destinationLabel: destinationEntityId === deviceEntity ? "Synthetic handset D-108" : "Meera Nair", caseId, incidentId: base.incident.id, sourceEvidenceId: "evidence-1", verificationLevel: IncidentVerificationLevel.DepartmentVerified };
}
function transaction(id: string, date: string, amount: number) {
  return { id, kind: "FINANCIAL" as const, subtype: "TRANSFER", occurredAt: new Date(date), sourceEntityId: personEntity, sourceLabel: "Arjun Mehta", destinationEntityId: meeraEntity, destinationLabel: "Synthetic account", caseId: "case-1", incidentId: base.incident.id, sourceEvidenceId: "evidence-2", verificationLevel: IncidentVerificationLevel.CrossVerified, amount, currency: "INR" };
}

describe("buildDeterministicAnalysis", () => {
  it("produces transparent, evidence-grounded change leads from raw records", () => {
    const data = { ...base, activities: [communication("b1", "2026-08-03"), communication("b2", "2026-08-05"), communication("b3", "2026-08-07"), ...Array.from({ length: 12 }, (_, index) => communication(`s${index}`, `2026-08-${15 + Math.floor(index / 6)}T0${index % 6}:00:00.000Z`)), communication("device-a", "2026-08-16T10:00:00.000Z", deviceEntity, "case-1"), communication("device-b", "2026-08-17T08:00:00.000Z", deviceEntity, "case-2"), transaction("t1", "2026-08-03", 10_000), transaction("t2", "2026-08-05", 18_500), transaction("t3", "2026-08-07", 25_000), transaction("t4", "2026-08-16", 480_000)], relationships: [{ id: "relationship-1", occurredAt: new Date("2026-08-17"), sourceEntityId: personEntity, targetEntityId: deviceEntity, relationshipType: "MAY_USE", verificationLevel: "UNVERIFIED", evidenceIds: ["evidence-3"] }] };
    const result = buildDeterministicAnalysis(data, 7, 2);
    expect(result.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining(["communication-spike", "new-contact", "financial-volume", "network-change", "cross-case:Synthetic handset D-108"]));
    expect(result.findings.every((finding) => finding.status === "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED")).toBe(true);
    expect(result.timeline.every((item) => item.sourceRecordType === "COMMUNICATION" || item.sourceRecordType === "FINANCIAL")).toBe(true);
  });
});
