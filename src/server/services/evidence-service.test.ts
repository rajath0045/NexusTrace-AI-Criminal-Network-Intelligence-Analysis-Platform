import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { MAX_EVIDENCE_BYTES, type EvidenceFile } from "@/domain/evidence";
import { UserRole, VerificationState } from "@/domain/model";
import type { EvidenceRepository } from "@/server/repositories/evidence-repository";
import type { EvidenceStorage } from "@/server/storage/evidence-storage";
import { EvidenceService } from "./evidence-service";

const departmentActor: Actor = {
  userId: "20000000-0000-4000-8000-000000000002",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "10000000-0000-4000-8000-000000000002",
};

const evidenceRecord = {
  id: "50000000-0000-4000-8000-000000000009",
  caseId: "30000000-0000-4000-8000-000000000001",
  originalFilename: "report.csv",
  mediaType: "text/csv",
  byteSize: 5,
  checksumSha256: createHash("sha256").update("hello").digest("hex"),
  storageKey: "2026/09/random.csv",
  description: "Synthetic test evidence.",
  verificationState: VerificationState.Pending,
  uploadedAt: new Date("2026-09-18T00:00:00.000Z"),
  uploadedByName: "Dev Malhotra",
};

function repositoryStub(): EvidenceRepository {
  return {
    findCaseForActor: vi.fn(async () => ({ id: evidenceRecord.caseId })),
    listForCase: vi.fn(async () => []),
    create: vi.fn(async () => evidenceRecord),
    findForActor: vi.fn(async () => evidenceRecord),
  };
}

function storageStub(): EvidenceStorage {
  return {
    put: vi.fn(async () => ({ storageKey: evidenceRecord.storageKey })),
    open: vi.fn(async () => ({ stream: new ReadableStream<Uint8Array>() })),
    delete: vi.fn(async () => undefined),
  };
}

describe("EvidenceService", () => {
  it("rejects disallowed media types with a typed validation error", async () => {
    const service = new EvidenceService(repositoryStub(), storageStub());
    const file = new File(["binary"], "payload.exe", { type: "application/x-msdownload" });

    await expect(service.attachEvidence(departmentActor, evidenceRecord.caseId, file, {}))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects files above the configured size before reading bytes", async () => {
    const service = new EvidenceService(repositoryStub(), storageStub());
    const file: EvidenceFile = {
      name: "oversize.pdf",
      type: "application/pdf",
      size: MAX_EVIDENCE_BYTES + 1,
      arrayBuffer: vi.fn(),
    };

    await expect(service.attachEvidence(departmentActor, evidenceRecord.caseId, file, {}))
      .rejects.toMatchObject({ code: "VALIDATION" });
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });

  it("prevents investigators from attaching evidence", async () => {
    const repository = repositoryStub();
    const storage = storageStub();
    const service = new EvidenceService(repository, storage);
    const investigator = { ...departmentActor, role: UserRole.Investigator };

    await expect(service.attachEvidence(
      investigator,
      evidenceRecord.caseId,
      new File(["hello"], "report.csv", { type: "text/csv" }),
      {},
    )).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("normalizes the filename, calculates SHA-256, and removes storage on metadata failure", async () => {
    const repository = repositoryStub();
    const storage = storageStub();
    vi.mocked(repository.create).mockRejectedValueOnce(new Error("database unavailable"));
    const service = new EvidenceService(repository, storage);

    await expect(service.attachEvidence(
      departmentActor,
      evidenceRecord.caseId,
      new File(["hello"], "../../Call Summary 01.csv", { type: "text/csv" }),
      { description: "Synthetic call metadata." },
    )).rejects.toThrow("database unavailable");

    expect(repository.create).toHaveBeenCalledWith(
      departmentActor,
      evidenceRecord.caseId,
      expect.objectContaining({
        originalFilename: "Call-Summary-01.csv",
        checksumSha256: evidenceRecord.checksumSha256,
      }),
    );
    expect(storage.delete).toHaveBeenCalledWith(evidenceRecord.storageKey);
  });

  it("does not retrieve metadata or bytes outside actor scope", async () => {
    const repository = repositoryStub();
    const storage = storageStub();
    vi.mocked(repository.findForActor).mockResolvedValueOnce(null);
    const service = new EvidenceService(repository, storage);

    await expect(service.openEvidence(departmentActor, evidenceRecord.id))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(storage.open).not.toHaveBeenCalled();
  });
});
