-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRATOR', 'DEPARTMENT_USER', 'INVESTIGATOR');

-- CreateEnum
CREATE TYPE "CaseParticipation" AS ENUM ('SUSPECT', 'VICTIM', 'WITNESS', 'COMPLAINANT', 'INVESTIGATOR');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GraphEntityType" AS ENUM ('PERSON', 'VEHICLE', 'PROPERTY', 'PHONE', 'DEVICE', 'BANK_ACCOUNT', 'ORGANIZATION', 'LOCATION', 'CASE', 'INCIDENT');

-- CreateEnum
CREATE TYPE "RelationshipStrength" AS ENUM ('PRIMARY', 'SECONDARY', 'TERTIARY');

-- CreateEnum
CREATE TYPE "EvidenceConfidence" AS ENUM ('VERIFIED', 'PROBABLE', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" UUID NOT NULL,
    "firNumber" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "occurrenceLocation" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "investigatingOfficerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" UUID NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "identityData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePerson" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "participation" "CaseParticipation" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "description" TEXT,
    "verificationState" "VerificationState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEntity" (
    "id" UUID NOT NULL,
    "entityType" "GraphEntityType" NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "verificationState" "VerificationState" NOT NULL DEFAULT 'PENDING',
    "departmentId" UUID NOT NULL,
    "personId" UUID,
    "caseId" UUID,
    "canonicalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphRelationship" (
    "id" UUID NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "strength" "RelationshipStrength" NOT NULL,
    "evidenceConfidence" "EvidenceConfidence" NOT NULL,
    "verificationState" "VerificationState" NOT NULL DEFAULT 'PENDING',
    "interactionSummary" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "departmentId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipEvidence" (
    "id" UUID NOT NULL,
    "relationshipId" UUID NOT NULL,
    "evidenceId" UUID NOT NULL,
    "sourceCaseId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "departmentId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "outcome" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Case_firNumber_key" ON "Case"("firNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_departmentId_status_idx" ON "Case"("departmentId", "status");

-- CreateIndex
CREATE INDEX "Case_investigatingOfficerId_idx" ON "Case"("investigatingOfficerId");

-- CreateIndex
CREATE INDEX "Person_familyName_givenName_idx" ON "Person"("familyName", "givenName");

-- CreateIndex
CREATE INDEX "CasePerson_caseId_idx" ON "CasePerson"("caseId");

-- CreateIndex
CREATE INDEX "CasePerson_personId_idx" ON "CasePerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CasePerson_caseId_personId_participation_key" ON "CasePerson"("caseId", "personId", "participation");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_storageKey_key" ON "Evidence"("storageKey");

-- CreateIndex
CREATE INDEX "Evidence_caseId_idx" ON "Evidence"("caseId");

-- CreateIndex
CREATE INDEX "Evidence_departmentId_verificationState_idx" ON "Evidence"("departmentId", "verificationState");

-- CreateIndex
CREATE INDEX "Evidence_uploadedById_idx" ON "Evidence"("uploadedById");

-- CreateIndex
CREATE INDEX "Evidence_checksumSha256_idx" ON "Evidence"("checksumSha256");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEntity_personId_key" ON "GraphEntity"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEntity_caseId_key" ON "GraphEntity"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEntity_canonicalReference_key" ON "GraphEntity"("canonicalReference");

-- CreateIndex
CREATE INDEX "GraphEntity_departmentId_entityType_idx" ON "GraphEntity"("departmentId", "entityType");

-- CreateIndex
CREATE INDEX "GraphEntity_verificationState_idx" ON "GraphEntity"("verificationState");

-- CreateIndex
CREATE INDEX "GraphRelationship_sourceEntityId_verificationState_strength_idx" ON "GraphRelationship"("sourceEntityId", "verificationState", "strength");

-- CreateIndex
CREATE INDEX "GraphRelationship_targetEntityId_verificationState_strength_idx" ON "GraphRelationship"("targetEntityId", "verificationState", "strength");

-- CreateIndex
CREATE INDEX "GraphRelationship_departmentId_idx" ON "GraphRelationship"("departmentId");

-- CreateIndex
CREATE INDEX "GraphRelationship_createdById_idx" ON "GraphRelationship"("createdById");

-- CreateIndex
CREATE INDEX "GraphRelationship_verifiedById_idx" ON "GraphRelationship"("verifiedById");

-- CreateIndex
CREATE INDEX "RelationshipEvidence_relationshipId_idx" ON "RelationshipEvidence"("relationshipId");

-- CreateIndex
CREATE INDEX "RelationshipEvidence_evidenceId_idx" ON "RelationshipEvidence"("evidenceId");

-- CreateIndex
CREATE INDEX "RelationshipEvidence_sourceCaseId_idx" ON "RelationshipEvidence"("sourceCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipEvidence_relationshipId_evidenceId_key" ON "RelationshipEvidence"("relationshipId", "evidenceId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_departmentId_createdAt_idx" ON "AuditEvent"("departmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_investigatingOfficerId_fkey" FOREIGN KEY ("investigatingOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEntity" ADD CONSTRAINT "GraphEntity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEntity" ADD CONSTRAINT "GraphEntity_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEntity" ADD CONSTRAINT "GraphEntity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelationship" ADD CONSTRAINT "GraphRelationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelationship" ADD CONSTRAINT "GraphRelationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelationship" ADD CONSTRAINT "GraphRelationship_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelationship" ADD CONSTRAINT "GraphRelationship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelationship" ADD CONSTRAINT "GraphRelationship_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEvidence" ADD CONSTRAINT "RelationshipEvidence_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "GraphRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEvidence" ADD CONSTRAINT "RelationshipEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEvidence" ADD CONSTRAINT "RelationshipEvidence_sourceCaseId_fkey" FOREIGN KEY ("sourceCaseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
