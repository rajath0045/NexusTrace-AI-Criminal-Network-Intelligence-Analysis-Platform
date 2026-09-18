"use server";

import { revalidatePath } from "next/cache";
import { casePersonInputSchema } from "@/domain/person";
import { getCurrentActor } from "@/server/auth/session";
import { associatePerson } from "@/server/services/person-service";

export interface AssociatePersonState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

export async function associatePersonAction(
  _previousState: AssociatePersonState,
  formData: FormData,
): Promise<AssociatePersonState> {
  const actor = await getCurrentActor();
  if (!actor) return { error: "Your session has expired. Sign in again." };

  const parsed = casePersonInputSchema.safeParse({
    caseId: formData.get("caseId"),
    personId: formData.get("personId"),
    participation: formData.get("participation"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      error: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await associatePerson(actor, parsed.data);
    revalidatePath(`/cases/${parsed.data.caseId}`);
    revalidatePath(`/people/${parsed.data.personId}`);
    return { success: true };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "CONFLICT") return { error: "This person already has that role in the case." };
      if (error.code === "FORBIDDEN") return { error: "You do not have permission to associate profiles." };
      if (error.code === "NOT_FOUND") return { error: "The case or person profile is not available in your access scope." };
    }
    return { error: "The profile could not be associated. Try again." };
  }
}
