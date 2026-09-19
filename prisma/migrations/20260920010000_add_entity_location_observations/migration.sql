CREATE TYPE "LocationObservationType" AS ENUM (
  'RESIDENCE',
  'PROPERTY',
  'REGISTERED_ADDRESS',
  'OBSERVED_PERSON_LOCATION',
  'VEHICLE_OBSERVATION',
  'DEVICE_OBSERVATION',
  'INCIDENT_LOCATION',
  'EVIDENCE_LOCATION',
  'OTHER_AUTHORIZED_OBSERVATION'
);

CREATE TYPE "LocationSourceRecordType" AS ENUM (
  'CASE',
  'INCIDENT',
  'EVIDENCE',
  'COMMUNICATION',
  'RELATIONSHIP'
);

CREATE TABLE "EntityLocationObservation" (
  "id" UUID NOT NULL,
  "graphEntityId" UUID NOT NULL,
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "observationType" "LocationObservationType" NOT NULL,
  "locationLabel" TEXT NOT NULL,
  "context" TEXT,
  "accuracyMeters" INTEGER,
  "sourceRecordType" "LocationSourceRecordType" NOT NULL,
  "sourceRecordId" UUID NOT NULL,
  "sourceEvidenceId" UUID,
  "departmentId" UUID NOT NULL,
  "verificationLevel" "IncidentVerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EntityLocationObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EntityLocationObservation_graphEntityId_observedAt_idx" ON "EntityLocationObservation"("graphEntityId", "observedAt");
CREATE INDEX "EntityLocationObservation_departmentId_observedAt_idx" ON "EntityLocationObservation"("departmentId", "observedAt");
CREATE INDEX "EntityLocationObservation_sourceRecordType_sourceRecordId_idx" ON "EntityLocationObservation"("sourceRecordType", "sourceRecordId");
CREATE INDEX "EntityLocationObservation_observationType_observedAt_idx" ON "EntityLocationObservation"("observationType", "observedAt");
CREATE INDEX "EntityLocationObservation_sourceEvidenceId_idx" ON "EntityLocationObservation"("sourceEvidenceId");
CREATE INDEX "EntityLocationObservation_createdById_idx" ON "EntityLocationObservation"("createdById");

ALTER TABLE "EntityLocationObservation" ADD CONSTRAINT "EntityLocationObservation_graphEntityId_fkey" FOREIGN KEY ("graphEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityLocationObservation" ADD CONSTRAINT "EntityLocationObservation_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityLocationObservation" ADD CONSTRAINT "EntityLocationObservation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EntityLocationObservation" ADD CONSTRAINT "EntityLocationObservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
