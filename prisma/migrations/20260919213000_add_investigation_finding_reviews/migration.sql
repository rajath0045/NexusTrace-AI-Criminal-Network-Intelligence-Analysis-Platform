-- Human review remains distinct from evidence, incident, and relationship verification.
CREATE TYPE "FindingReviewStatus" AS ENUM ('UNREVIEWED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'NEEDS_MORE_EVIDENCE', 'DISMISSED', 'ESCALATED');

CREATE TYPE "FindingDispositionReason" AS ENUM ('RELEVANT_TO_CASE', 'SUPPORTS_EXISTING_LEAD', 'REQUIRES_FOLLOW_UP', 'INSUFFICIENT_HISTORY', 'WEAK_PROVENANCE', 'MISSING_SOURCE_RECORD', 'REQUIRES_DEPARTMENT_INPUT', 'EXPECTED_BEHAVIOR', 'DUPLICATE_FINDING', 'DATA_QUALITY_ISSUE', 'FALSE_POSITIVE', 'NOT_RELEVANT_TO_CASE', 'CROSS_CASE_RELEVANCE', 'CROSS_DEPARTMENT_RELEVANCE', 'REQUIRES_SUPERVISOR_REVIEW', 'REQUIRES_ADMIN_CROSS_VERIFICATION');

CREATE TABLE "InvestigationFinding" (
  "id" UUID NOT NULL,
  "findingKey" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "personId" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "caseId" UUID,
  "departmentId" UUID NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supportingRecordIds" JSONB NOT NULL,
  "evidenceIds" JSONB NOT NULL,
  "verificationLevels" JSONB NOT NULL,
  "reviewStatus" "FindingReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvestigationFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FindingReview" (
  "id" UUID NOT NULL,
  "findingId" UUID NOT NULL,
  "reviewerUserId" UUID NOT NULL,
  "reviewerDepartmentId" UUID NOT NULL,
  "previousStatus" "FindingReviewStatus" NOT NULL,
  "status" "FindingReviewStatus" NOT NULL,
  "reasonCode" "FindingDispositionReason" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FindingReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvestigationFinding_findingKey_key" ON "InvestigationFinding"("findingKey");
CREATE INDEX "InvestigationFinding_departmentId_reviewStatus_generatedAt_idx" ON "InvestigationFinding"("departmentId", "reviewStatus", "generatedAt");
CREATE INDEX "InvestigationFinding_personId_generatedAt_idx" ON "InvestigationFinding"("personId", "generatedAt");
CREATE INDEX "InvestigationFinding_incidentId_generatedAt_idx" ON "InvestigationFinding"("incidentId", "generatedAt");
CREATE INDEX "InvestigationFinding_caseId_generatedAt_idx" ON "InvestigationFinding"("caseId", "generatedAt");
CREATE INDEX "FindingReview_findingId_createdAt_idx" ON "FindingReview"("findingId", "createdAt");
CREATE INDEX "FindingReview_reviewerUserId_createdAt_idx" ON "FindingReview"("reviewerUserId", "createdAt");
CREATE INDEX "FindingReview_reviewerDepartmentId_createdAt_idx" ON "FindingReview"("reviewerDepartmentId", "createdAt");

ALTER TABLE "InvestigationFinding" ADD CONSTRAINT "InvestigationFinding_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvestigationFinding" ADD CONSTRAINT "InvestigationFinding_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvestigationFinding" ADD CONSTRAINT "InvestigationFinding_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvestigationFinding" ADD CONSTRAINT "InvestigationFinding_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FindingReview" ADD CONSTRAINT "FindingReview_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InvestigationFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FindingReview" ADD CONSTRAINT "FindingReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FindingReview" ADD CONSTRAINT "FindingReview_reviewerDepartmentId_fkey" FOREIGN KEY ("reviewerDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
