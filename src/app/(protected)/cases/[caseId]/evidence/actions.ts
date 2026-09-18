"use server";

import { revalidatePath } from "next/cache";
import { evidenceMetadataInputSchema, type EvidenceFile } from "@/domain/evidence";
import { getCurrentActor } from "@/server/auth/session";
import { attachEvidence } from "@/server/services/evidence-service";

export interface AttachEvidenceState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

function isEvidenceFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && typeof value.arrayBuffer === "function";
}

export async function attachEvidenceAction(
  _previousState: AttachEvidenceState,
  formData: FormData,
): Promise<AttachEvidenceState> {
  const actor = await getCurrentActor();
  if (!actor) return { error: "Your session has expired. Sign in again." };

  const caseId = formData.get("caseId");
  const file = formData.get("file");
  const metadata = evidenceMetadataInputSchema.safeParse({ description: formData.get("description") });
  const fieldErrors: Record<string, string[] | undefined> = metadata.success
    ? {}
    : metadata.error.flatten().fieldErrors;

  if (typeof caseId !== "string" || !isEvidenceFile(file)) {
    if (!isEvidenceFile(file)) fieldErrors.file = ["Select an evidence file."];
    return { error: "Review the highlighted fields.", fieldErrors };
  }
  if (!metadata.success) return { error: "Review the highlighted fields.", fieldErrors };

  try {
    await attachEvidence(actor, caseId, file as EvidenceFile, metadata.data);
    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "VALIDATION") return { error: error instanceof Error ? error.message : "The file is invalid." };
      if (error.code === "FORBIDDEN") return { error: "You do not have permission to attach evidence." };
      if (error.code === "NOT_FOUND") return { error: "The case is not available in your access scope." };
      if (error.code === "STORAGE") return { error: "The evidence file could not be stored securely." };
    }
    return { error: "The evidence could not be attached. Try again." };
  }
}
