import { createHash } from "node:crypto";
import type { Actor } from "@/domain/auth";
import {
  ALLOWED_EVIDENCE_MEDIA_TYPES,
  evidenceMetadataInputSchema,
  MAX_EVIDENCE_BYTES,
  normalizeEvidenceFilename,
  type EvidenceFile,
  type EvidenceMetadataInput,
  type EvidenceRecord,
} from "@/domain/evidence";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { assertCan } from "@/server/authorization/policy";
import { getServerEnvironment } from "@/server/env";
import type { EvidenceRepository } from "@/server/repositories/evidence-repository";
import { PrismaEvidenceRepository } from "@/server/repositories/prisma-evidence-repository";
import type { EvidenceStorage, EvidenceStorageOpenResult } from "@/server/storage/evidence-storage";
import { LocalEvidenceStorage } from "@/server/storage/local-evidence-storage";

export interface OpenEvidenceResult extends EvidenceStorageOpenResult {
  record: EvidenceRecord;
}

function validateFile(file: EvidenceFile): void {
  if (!file.name || file.size < 1) {
    throw new ValidationError("Select a non-empty evidence file.");
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new ValidationError("Evidence files must be 10 MB or smaller.");
  }
  if (!ALLOWED_EVIDENCE_MEDIA_TYPES.has(file.type)) {
    throw new ValidationError("That evidence file type is not allowed.");
  }
}

export class EvidenceService {
  constructor(
    private readonly repository: EvidenceRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async listCaseEvidence(actor: Actor, caseId: string): Promise<EvidenceRecord[]> {
    assertCan(actor, "CASE_VIEW");
    const evidence = await this.repository.listForCase(actor, caseId);
    if (!evidence) throw new NotFoundError();
    return evidence;
  }

  async attachEvidence(
    actor: Actor,
    caseId: string,
    file: EvidenceFile,
    input: EvidenceMetadataInput,
  ): Promise<EvidenceRecord> {
    assertCan(actor, "EVIDENCE_ATTACH");
    const metadata = evidenceMetadataInputSchema.parse(input);
    validateFile(file);
    if (!(await this.repository.findCaseForActor(actor, caseId))) throw new NotFoundError();

    const bytes = new Uint8Array(await file.arrayBuffer());
    const originalFilename = normalizeEvidenceFilename(file.name);
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const stored = await this.storage.put({ bytes, originalFilename });

    try {
      return await this.repository.create(actor, caseId, {
        originalFilename,
        mediaType: file.type,
        byteSize: bytes.byteLength,
        checksumSha256,
        storageKey: stored.storageKey,
        description: metadata.description,
      });
    } catch (error) {
      try {
        await this.storage.delete(stored.storageKey);
      } catch {
        // Preserve the metadata failure; orphan cleanup can be retried operationally.
      }
      throw error;
    }
  }

  async openEvidence(actor: Actor, evidenceId: string): Promise<OpenEvidenceResult> {
    assertCan(actor, "CASE_VIEW");
    const record = await this.repository.findForActor(actor, evidenceId);
    if (!record) throw new NotFoundError();
    const opened = await this.storage.open(record.storageKey);
    return { record, ...opened };
  }
}

const evidenceService = new EvidenceService(
  new PrismaEvidenceRepository(),
  new LocalEvidenceStorage(getServerEnvironment().EVIDENCE_STORAGE_ROOT),
);

export const listCaseEvidence = evidenceService.listCaseEvidence.bind(evidenceService);
export const attachEvidence = evidenceService.attachEvidence.bind(evidenceService);
export const openEvidence = evidenceService.openEvidence.bind(evidenceService);
