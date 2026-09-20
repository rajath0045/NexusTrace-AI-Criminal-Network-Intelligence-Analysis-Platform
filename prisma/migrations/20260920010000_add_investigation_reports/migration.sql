CREATE TYPE "ReportType" AS ENUM ('INVESTIGATION_REPORT');
CREATE TYPE "ReportStatus" AS ENUM ('GENERATED');

CREATE TABLE "Report" (
  "id" UUID NOT NULL,
  "reportNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reportType" "ReportType" NOT NULL DEFAULT 'INVESTIGATION_REPORT',
  "departmentId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "incidentId" UUID,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportVersion" (
  "id" UUID NOT NULL,
  "reportId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'GENERATED',
  "snapshot" JSONB NOT NULL,
  "timelineStart" TIMESTAMP(3),
  "timelineEnd" TIMESTAMP(3),
  "generatedById" UUID NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportSourceReference" (
  "id" UUID NOT NULL,
  "reportVersionId" UUID NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "caseId" UUID,
  "incidentId" UUID,
  "evidenceId" UUID,
  "actorId" UUID,
  "observedAt" TIMESTAMP(3),
  "verificationState" TEXT,
  "reviewState" TEXT,
  "metadata" JSONB,
  CONSTRAINT "ReportSourceReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Report_reportNumber_key" ON "Report"("reportNumber");
CREATE INDEX "Report_departmentId_createdAt_idx" ON "Report"("departmentId", "createdAt");
CREATE INDEX "Report_caseId_createdAt_idx" ON "Report"("caseId", "createdAt");
CREATE INDEX "Report_incidentId_createdAt_idx" ON "Report"("incidentId", "createdAt");
CREATE UNIQUE INDEX "ReportVersion_reportId_version_key" ON "ReportVersion"("reportId", "version");
CREATE INDEX "ReportVersion_reportId_generatedAt_idx" ON "ReportVersion"("reportId", "generatedAt");
CREATE UNIQUE INDEX "ReportSourceReference_reportVersionId_sourceType_sourceId_key" ON "ReportSourceReference"("reportVersionId", "sourceType", "sourceId");
CREATE INDEX "ReportSourceReference_reportVersionId_sourceType_idx" ON "ReportSourceReference"("reportVersionId", "sourceType");

ALTER TABLE "Report" ADD CONSTRAINT "Report_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportSourceReference" ADD CONSTRAINT "ReportSourceReference_reportVersionId_fkey" FOREIGN KEY ("reportVersionId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
