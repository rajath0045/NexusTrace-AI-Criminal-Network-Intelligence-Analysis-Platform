-- CreateTable
CREATE TABLE "UserWorkspaceLayout" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkspaceLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWorkspaceLayout_userId_idx" ON "UserWorkspaceLayout"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspaceLayout_userId_workspaceKey_key" ON "UserWorkspaceLayout"("userId", "workspaceKey");

-- AddForeignKey
ALTER TABLE "UserWorkspaceLayout" ADD CONSTRAINT "UserWorkspaceLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "GraphRelationship_sourceEntityId_targetEntityId_relationshipTyp" RENAME TO "GraphRelationship_sourceEntityId_targetEntityId_relationshi_key";
