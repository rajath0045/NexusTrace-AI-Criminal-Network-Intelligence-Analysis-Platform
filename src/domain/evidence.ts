import { z } from "zod";
import type { VerificationState } from "./model";

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EVIDENCE_MEDIA_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "text/plain",
]);

export const evidenceMetadataInputSchema = z.object({
  description: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(1_000).optional(),
  ),
});

export type EvidenceMetadataInput = z.infer<typeof evidenceMetadataInputSchema>;

export interface EvidenceFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface EvidenceCreateData {
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  checksumSha256: string;
  storageKey: string;
  description?: string;
}

export interface EvidenceRecord extends Omit<EvidenceCreateData, "description"> {
  id: string;
  caseId: string;
  description: string | null;
  verificationState: VerificationState;
  uploadedAt: Date;
  uploadedByName: string;
}

export function normalizeEvidenceFilename(filename: string): string {
  const basename = filename.replaceAll("\\", "/").split("/").pop() ?? "evidence";
  const normalized = basename
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 160);

  return normalized || "evidence";
}
