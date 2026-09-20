import { initializeNeo4jSchema, projectCanonicalGraph } from "../src/server/graph/neo4j-projection";

await initializeNeo4jSchema();
const summary = await projectCanonicalGraph();
console.log(`Neo4j projection synchronized: ${summary.entities} entities, ${summary.relationships} relationships.`);
