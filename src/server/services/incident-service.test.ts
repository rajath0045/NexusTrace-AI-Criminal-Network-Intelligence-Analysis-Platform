import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import type { IncidentRepository } from "@/server/repositories/incident-repository";
import { IncidentService } from "./incident-service";
import { IncidentParticipation, IncidentSubmissionStatus, IncidentType, IncidentVerificationLevel, UserRole } from "@/domain/model";

const ids = { incident: "80000000-0000-4000-8000-000000000001", case: "30000000-0000-4000-8000-000000000001", person: "40000000-0000-4000-8000-000000000001", evidence: "50000000-0000-4000-8000-000000000001" } as const;
const investigator: Actor = { userId: "20000000-0000-4000-8000-000000000003", email: "investigator@nexustrace.demo", displayName: "Ishaan Sen", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };
const departmentUser = { ...investigator, role: UserRole.DepartmentUser };
const administrator = { ...investigator, role: UserRole.Administrator };
const input = { incidentNumber: "INC-999", incidentType: IncidentType.SuspiciousEvent, title: "Synthetic incident observation", description: "Synthetic incident observation suitable for a service test.", occurredAt: new Date("2026-09-01T09:00:00.000Z"), location: "Synthetic location", caseId: ids.case, people: [{ personId: ids.person, participation: IncidentParticipation.Witness }], evidenceIds: [ids.evidence] };

function repositoryStub(): IncidentRepository {
  return { listForActor: vi.fn(), listEntityCandidatesForActor: vi.fn(), findForActor: vi.fn(), create: vi.fn(), update: vi.fn(), review: vi.fn(), verify: vi.fn(), timelineForActor: vi.fn() };
}

describe("IncidentService", () => {
  it("records investigator intelligence as a pending submission rather than canonical verification", async () => {
    const repository = repositoryStub();
    vi.mocked(repository.create).mockResolvedValue({ id: ids.incident } as never);
    const service = new IncidentService(repository);
    await service.submitIncident(investigator, input);
    expect(repository.create).toHaveBeenCalledWith(investigator, input, "SUBMISSION");
  });

  it("prevents an investigator from creating canonical incidents or department-verifying a submission", async () => {
    const service = new IncidentService(repositoryStub());
    await expect(service.createIncident(investigator, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.verifyIncident(investigator, ids.incident, { level: IncidentVerificationLevel.DepartmentVerified, reason: "Sufficient source material." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a department user to review and department-verify only through the repository scope", async () => {
    const repository = repositoryStub();
    vi.mocked(repository.review).mockResolvedValue({ id: ids.incident } as never);
    vi.mocked(repository.verify).mockResolvedValue({ id: ids.incident } as never);
    const service = new IncidentService(repository);
    await service.reviewIncident(departmentUser, ids.incident, { decision: IncidentSubmissionStatus.Accepted, reason: "Reviewed against source records." });
    await service.verifyIncident(departmentUser, ids.incident, { level: IncidentVerificationLevel.DepartmentVerified, reason: "Evidence validated." });
    expect(repository.review).toHaveBeenCalledWith(departmentUser, ids.incident, expect.objectContaining({ decision: IncidentSubmissionStatus.Accepted }));
    expect(repository.verify).toHaveBeenCalledWith(departmentUser, ids.incident, IncidentVerificationLevel.DepartmentVerified, "Evidence validated.");
  });

  it("reserves cross-verification for administrators", async () => {
    const repository = repositoryStub();
    vi.mocked(repository.verify).mockResolvedValue({ id: ids.incident } as never);
    const service = new IncidentService(repository);
    await expect(service.verifyIncident(departmentUser, ids.incident, { level: IncidentVerificationLevel.CrossVerified, reason: "Cross-source review." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await service.verifyIncident(administrator, ids.incident, { level: IncidentVerificationLevel.CrossVerified, reason: "Cross-source review." });
    expect(repository.verify).toHaveBeenCalledWith(administrator, ids.incident, IncidentVerificationLevel.CrossVerified, "Cross-source review.");
  });

  it("validates bounded timeline windows before repository access", async () => {
    const repository = repositoryStub();
    const service = new IncidentService(repository);
    await expect(service.getTimeline(investigator, { personId: ids.person, startTime: new Date("2026-09-03"), endTime: new Date("2026-09-01"), types: ["ALL"] })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(repository.timelineForActor).not.toHaveBeenCalled();
  });
});
