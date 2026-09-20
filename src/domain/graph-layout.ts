import { z } from "zod";

const coordinateSchema = z.object({ x: z.number().finite().min(-20_000).max(20_000), y: z.number().finite().min(-20_000).max(20_000) });

export const graphLayoutAlgorithmSchema = z.enum(["breadthfirst", "cose", "concentric", "circle"]);
export const graphPresentationSchema = z.object({
  version: z.literal(1),
  positions: z.record(z.string().uuid(), coordinateSchema).default({}),
  edgeRoutes: z.record(z.string().uuid(), z.number().finite().min(-300).max(300)).default({}),
  zoom: z.number().finite().min(0.45).max(2.4).optional(),
  pan: coordinateSchema.optional(),
  algorithm: graphLayoutAlgorithmSchema.default("breadthfirst"),
  filters: z.object({ relationshipTypes: z.array(z.string().max(80)).max(30).default([]) }).default({ relationshipTypes: [] }),
});

export type GraphPresentation = z.infer<typeof graphPresentationSchema>;

export function graphLayoutKey(focusEntityId: string): string {
  return `relationship-graph:${focusEntityId}`;
}
