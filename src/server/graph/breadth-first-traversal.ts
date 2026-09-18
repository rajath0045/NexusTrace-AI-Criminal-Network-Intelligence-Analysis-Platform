import { ValidationError } from "@/domain/errors";

export interface TraversalEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export async function traverseBounded<T extends TraversalEdge>(
  rootId: string,
  hops: number,
  loadLayer: (frontier: string[]) => Promise<T[]>,
): Promise<{ nodeIds: Set<string>; edges: T[] }> {
  if (!Number.isInteger(hops) || hops < 1 || hops > 3) {
    throw new ValidationError("Graph traversal depth must be between one and three hops.");
  }

  const visited = new Set([rootId]);
  const edgeMap = new Map<string, T>();
  let frontier = [rootId];

  for (let depth = 0; depth < hops && frontier.length > 0; depth += 1) {
    const layer = await loadLayer(frontier);
    const next = new Set<string>();

    for (const edge of layer) {
      edgeMap.set(edge.id, edge);
      for (const nodeId of [edge.sourceId, edge.targetId]) {
        if (!visited.has(nodeId)) next.add(nodeId);
        visited.add(nodeId);
      }
    }
    frontier = [...next];
  }

  return { nodeIds: visited, edges: [...edgeMap.values()] };
}
