"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { caseInputSchema } from "@/domain/case";
import { getCurrentActor } from "@/server/auth/session";
import { createCase } from "@/server/services/case-service";

export interface CreateCaseState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createCaseAction(
  _previousState: CreateCaseState,
  formData: FormData,
): Promise<CreateCaseState> {
  const actor = await getCurrentActor();
  if (!actor) return { error: "Your session has expired. Sign in again." };

  const parsed = caseInputSchema.safeParse({
    firNumber: formData.get("firNumber"),
    caseNumber: formData.get("caseNumber"),
    title: formData.get("title"),
    category: formData.get("category"),
    occurredAt: formData.get("occurredAt"),
    occurrenceLocation: formData.get("occurrenceLocation"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      error: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const created = await createCase(actor, parsed.data);
    revalidatePath("/cases");
    redirect(`/cases/${created.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "CONFLICT") {
        return { error: "That FIR or case number is already registered." };
      }
      if (error.code === "FORBIDDEN") {
        return { error: "You do not have permission to create cases." };
      }
    }
    return { error: "The case could not be created. Try again." };
  }
}
