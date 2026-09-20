import neo4j, { type Driver } from "neo4j-driver";
import { getNeo4jEnvironment } from "@/server/env";

export class Neo4jUnavailableError extends Error {
  readonly code = "GRAPH_UNAVAILABLE";
  constructor(message = "Relationship intelligence is temporarily unavailable.") {
    super(message);
  }
}

const globalForNeo4j = globalThis as unknown as { neo4jDriver?: Driver };

export function getNeo4jDriver(): Driver | null {
  const config = getNeo4jEnvironment();
  if (!config) return null;
  if (!globalForNeo4j.neo4jDriver) {
    globalForNeo4j.neo4jDriver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
      { maxConnectionPoolSize: 20, connectionAcquisitionTimeout: 5_000 },
    );
  }
  return globalForNeo4j.neo4jDriver;
}

export async function verifyNeo4jConnection(): Promise<"ok" | "not_configured"> {
  const driver = getNeo4jDriver();
  if (!driver) return "not_configured";
  try {
    await driver.verifyConnectivity();
    return "ok";
  } catch (error) {
    throw new Neo4jUnavailableError(error instanceof Error ? error.message : undefined);
  }
}
