CREATE TYPE "IncidentType" AS ENUM ('CRIME', 'SUSPICIOUS_EVENT', 'MEETING', 'ACCIDENT', 'TRANSACTION', 'COMMUNICATION', 'MOVEMENT', 'OTHER');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACTIVE', 'RESOLVED', 'ARCHIVED');
CREATE TYPE "IncidentSubmissionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'ACCEPTED');
CREATE TYPE "IncidentVerificationLevel" AS ENUM ('UNVERIFIED', 'DEPARTMENT_VERIFIED', 'CROSS_VERIFIED');
CREATE TYPE "IncidentParticipation" AS ENUM ('SUSPECT', 'ACCUSED', 'VICTIM', 'WITNESS', 'COMPLAINANT', 'INVESTIGATOR', 'OTHER');

CREATE TABLE "Incident" (
  "id" UUID NOT NULL,
  "incidentNumber" TEXT NOT NULL,
  "incidentType" "IncidentType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "submissionStatus" "IncidentSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "verificationLevel" "IncidentVerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
  "departmentId" UUID NOT NULL,
  "caseId" UUID,
  "submittedById" UUID NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "departmentVerifiedById" UUID,
  "departmentVerifiedAt" TIMESTAMP(3),
  "crossVerifiedById" UUID,
  "crossVerifiedAt" TIMESTAMP(3),
  "reviewReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentParticipant" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "personId" UUID,
  "graphEntityId" UUID,
  "participation" "IncidentParticipation" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentEvidence" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentEvidence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GraphEntity" ADD COLUMN "incidentId" UUID;
CREATE UNIQUE INDEX "GraphEntity_incidentId_key" ON "GraphEntity"("incidentId");
CREATE UNIQUE INDEX "Incident_incidentNumber_key" ON "Incident"("incidentNumber");
CREATE INDEX "Incident_departmentId_occurredAt_idx" ON "Incident"("departmentId", "occurredAt");
CREATE INDEX "Incident_caseId_occurredAt_idx" ON "Incident"("caseId", "occurredAt");
CREATE INDEX "Incident_submittedById_submissionStatus_idx" ON "Incident"("submittedById", "submissionStatus");
CREATE INDEX "Incident_verificationLevel_occurredAt_idx" ON "Incident"("verificationLevel", "occurredAt");
CREATE UNIQUE INDEX "IncidentParticipant_incidentId_personId_participation_key" ON "IncidentParticipant"("incidentId", "personId", "participation");
CREATE INDEX "IncidentParticipant_personId_createdAt_idx" ON "IncidentParticipant"("personId", "createdAt");
CREATE INDEX "IncidentParticipant_graphEntityId_createdAt_idx" ON "IncidentParticipant"("graphEntityId", "createdAt");
CREATE INDEX "IncidentParticipant_incidentId_idx" ON "IncidentParticipant"("incidentId");
CREATE UNIQUE INDEX "IncidentEvidence_incidentId_evidenceId_key" ON "IncidentEvidence"("incidentId", "evidenceId");
CREATE INDEX "IncidentEvidence_evidenceId_idx" ON "IncidentEvidence"("evidenceId");
CREATE INDEX "IncidentEvidence_incidentId_idx" ON "IncidentEvidence"("incidentId");
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_departmentVerifiedById_fkey" FOREIGN KEY ("departmentVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_crossVerifiedById_fkey" FOREIGN KEY ("crossVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentParticipant" ADD CONSTRAINT "IncidentParticipant_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentParticipant" ADD CONSTRAINT "IncidentParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentParticipant" ADD CONSTRAINT "IncidentParticipant_graphEntityId_fkey" FOREIGN KEY ("graphEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentEvidence" ADD CONSTRAINT "IncidentEvidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentEvidence" ADD CONSTRAINT "IncidentEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GraphEntity" ADD CONSTRAINT "GraphEntity_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
