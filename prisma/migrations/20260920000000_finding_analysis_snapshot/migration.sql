-- Preserve descriptive analysis context without duplicating authoritative records.
ALTER TABLE "InvestigationFinding" ADD COLUMN "analysisSnapshot" JSONB;
