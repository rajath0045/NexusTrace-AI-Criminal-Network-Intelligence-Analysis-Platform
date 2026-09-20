import { rebuildNeo4jProjection } from "../src/server/graph/neo4j-projection";

const summary = await rebuildNeo4jProjection();
console.log(`Neo4j projection rebuilt from PostgreSQL: ${summary.entities} entities, ${summary.relationships} relationships.`);
