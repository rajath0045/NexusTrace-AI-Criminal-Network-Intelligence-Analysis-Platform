# Neo4j relationship intelligence checkpoint

`checkpoint/pre-neo4j` is the protected `f131f66` baseline (the repository permissions in this environment prevent creating the local Git ref; recreate it with `git tag checkpoint/pre-neo4j f131f66` before committing). The enhancement is deliberately one additive milestone: schema/outbox, projection, controlled query adapter, relationship presentation, then tests and deployment verification. It can be rolled back by reverting its single feature commit without touching PostgreSQL domain data.

## Canonical-to-projection map

| PostgreSQL canonical record | Neo4j projection |
| --- | --- |
| `GraphEntity` | `:GraphEntity` plus one typed label (`Person`, `Phone`, `Vehicle`, `Property`, `Device`, `FinancialAccount`, `Organization`, `Location`, `Case`, or `Incident`), keyed by `postgresId` |
| `GraphRelationship` | semantic directed relationship with `relationshipId`, provenance case/evidence IDs, verification, strength, and observation window |
| `CommunicationRecord` | `CALLED`, `MESSAGED`, or `CONTACTED` relationship keyed by the canonical record ID |
| `FinancialTransaction` | `TRANSFERRED_TO` relationship keyed by the canonical transaction ID |

Each projection node and relationship retains its PostgreSQL reference. Neo4j IDs are not domain identifiers. Data is scoped by the canonical department ID before returning a bounded (1–3 hop) neighborhood; relationship detail remains read from PostgreSQL to retain exact provenance.
