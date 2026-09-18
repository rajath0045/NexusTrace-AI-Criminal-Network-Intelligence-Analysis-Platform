"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { incidentInputSchema, incidentReviewSchema } from "@/domain/incident";
import { IncidentVerificationLevel } from "@/domain/model";
import { getCurrentActor } from "@/server/auth/session";
import { createIncident, reviewIncident, submitIncident, verifyIncident } from "@/server/services/incident-service";

export interface IncidentActionState { error?: string; fieldErrors?: Record<string, string[] | undefined>; }

function readInput(formData: FormData) {
  return incidentInputSchema.safeParse({
    incidentNumber: formData.get("incidentNumber"), incidentType: formData.get("incidentType"), title: formData.get("title"), description: formData.get("description"), occurredAt: formData.get("occurredAt"), location: formData.get("location"), caseId: formData.get("caseId"),
    people: [
      ...formData.getAll("personIds").filter((value): value is string => typeof value === "string" && value.length > 0).map((personId) => ({ personId, participation: formData.get("participation") })),
      ...formData.getAll("entityIds").filter((value): value is string => typeof value === "string" && value.length > 0).map((graphEntityId) => ({ graphEntityId, participation: formData.get("participation") })),
    ],
    evidenceIds: formData.getAll("evidenceIds").filter((value): value is string => typeof value === "string" && value.length > 0),
  });
}

async function create(mode: "SUBMIT" | "CREATE", _previous: IncidentActionState, formData: FormData): Promise<IncidentActionState> {
  const actor = await getCurrentActor();
  if (!actor) return { error: "Your session has expired. Sign in again." };
  const parsed = readInput(formData);
  if (!parsed.success) return { error: "Review the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const incident = mode === "SUBMIT" ? await submitIncident(actor, parsed.data) : await createIncident(actor, parsed.data);
    revalidatePath("/incidents");
    redirect(`/incidents/${incident.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "FORBIDDEN") return { error: "You do not have permission to perform this incident action." };
      if (error.code === "NOT_FOUND") return { error: "A referenced record is not available in your access scope." };
      if (error.code === "CONFLICT") return { error: "That incident number already exists." };
      if (error.code === "VALIDATION") return { error: error instanceof Error ? error.message : "Review the supplied incident data." };
    }
    return { error: "The incident could not be saved. Try again." };
  }
}

export const submitIncidentAction = create.bind(null, "SUBMIT");
export const createIncidentAction = create.bind(null, "CREATE");

export async function reviewIncidentAction(formData: FormData) {
  const actor = await getCurrentActor();
  const incidentId = formData.get("incidentId");
  const parsed = incidentReviewSchema.safeParse({ decision: formData.get("decision"), reason: formData.get("reason") });
  if (!actor || typeof incidentId !== "string" || !parsed.success) return;
  await reviewIncident(actor, incidentId, parsed.data);
  revalidatePath(`/incidents/${incidentId}`);
}

export async function verifyIncidentAction(formData: FormData) {
  const actor = await getCurrentActor();
  const incidentId = formData.get("incidentId");
  const level = formData.get("level");
  const reason = formData.get("reason");
  if (!actor || typeof incidentId !== "string" || typeof reason !== "string" || !Object.values(IncidentVerificationLevel).includes(level as IncidentVerificationLevel)) return;
  await verifyIncident(actor, incidentId, { level: level as IncidentVerificationLevel, reason });
  revalidatePath(`/incidents/${incidentId}`);
}
