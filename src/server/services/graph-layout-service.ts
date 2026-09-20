import type { Actor } from "@/domain/auth";
import { graphLayoutKey, graphPresentationSchema, type GraphPresentation } from "@/domain/graph-layout";
import { prisma } from "@/server/db/client";

const defaultPresentation: GraphPresentation = { version: 1, positions: {}, edgeRoutes: {}, algorithm: "cose", filters: { relationshipTypes: [] } };

export async function getGraphPresentation(actor: Actor, focusEntityId: string): Promise<GraphPresentation> {
  const stored = await prisma.userWorkspaceLayout.findUnique({ where: { userId_workspaceKey: { userId: actor.userId, workspaceKey: graphLayoutKey(focusEntityId) } } });
  const parsed = stored ? graphPresentationSchema.safeParse(stored.layoutJson) : null;
  return parsed?.success ? parsed.data : defaultPresentation;
}

export async function saveGraphPresentation(actor: Actor, focusEntityId: string, input: unknown): Promise<GraphPresentation> {
  const presentation = graphPresentationSchema.parse(input);
  await prisma.userWorkspaceLayout.upsert({
    where: { userId_workspaceKey: { userId: actor.userId, workspaceKey: graphLayoutKey(focusEntityId) } },
    update: { version: presentation.version, layoutJson: presentation },
    create: { userId: actor.userId, workspaceKey: graphLayoutKey(focusEntityId), version: presentation.version, layoutJson: presentation },
  });
  return presentation;
}

export async function resetGraphPresentation(actor: Actor, focusEntityId: string): Promise<GraphPresentation> {
  await prisma.userWorkspaceLayout.deleteMany({ where: { userId: actor.userId, workspaceKey: graphLayoutKey(focusEntityId) } });
  return defaultPresentation;
}
