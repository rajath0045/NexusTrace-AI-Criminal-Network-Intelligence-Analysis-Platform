-- Reconcile the legacy PostgreSQL-truncated index name before later migrations.
ALTER INDEX "GraphRelationship_sourceEntityId_targetEntityId_relationshipTyp" RENAME TO "GraphRelationship_sourceEntityId_targetEntityId_relationshi_key";
