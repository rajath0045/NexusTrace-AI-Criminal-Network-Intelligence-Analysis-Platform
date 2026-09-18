-- Extend relationship intelligence without duplicating canonical graph entities.
ALTER TABLE "GraphRelationship"
ADD COLUMN "interactionCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "GraphRelationship_sourceEntityId_targetEntityId_relationshipType_key"
ON "GraphRelationship"("sourceEntityId", "targetEntityId", "relationshipType");
