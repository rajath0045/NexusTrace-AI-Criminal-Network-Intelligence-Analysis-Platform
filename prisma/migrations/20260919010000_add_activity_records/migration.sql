-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('CALL', 'MESSAGE', 'EMAIL', 'DIGITAL_CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('TRANSFER', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'PAYMENT', 'OTHER');

-- CreateTable
CREATE TABLE "CommunicationRecord" (
    "id" UUID NOT NULL,
    "communicationNumber" TEXT NOT NULL,
    "communicationType" "CommunicationType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "destinationEntityId" UUID NOT NULL,
    "sourceIdentifier" TEXT,
    "destinationIdentifier" TEXT,
    "durationSeconds" INTEGER,
    "direction" "CommunicationDirection" NOT NULL DEFAULT 'UNKNOWN',
    "caseId" UUID,
    "incidentId" UUID,
    "sourceEvidenceId" UUID,
    "departmentId" UUID NOT NULL,
    "verificationLevel" "IncidentVerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" UUID NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "transactionType" "FinancialTransactionType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "destinationEntityId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "caseId" UUID,
    "incidentId" UUID,
    "sourceEvidenceId" UUID,
    "departmentId" UUID NOT NULL,
    "verificationLevel" "IncidentVerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationRecord_communicationNumber_key" ON "CommunicationRecord"("communicationNumber");

-- CreateIndex
CREATE INDEX "CommunicationRecord_departmentId_occurredAt_idx" ON "CommunicationRecord"("departmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationRecord_caseId_occurredAt_idx" ON "CommunicationRecord"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationRecord_incidentId_occurredAt_idx" ON "CommunicationRecord"("incidentId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationRecord_sourceEntityId_occurredAt_idx" ON "CommunicationRecord"("sourceEntityId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationRecord_destinationEntityId_occurredAt_idx" ON "CommunicationRecord"("destinationEntityId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_transactionNumber_key" ON "FinancialTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "FinancialTransaction_departmentId_occurredAt_idx" ON "FinancialTransaction"("departmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_caseId_occurredAt_idx" ON "FinancialTransaction"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_incidentId_occurredAt_idx" ON "FinancialTransaction"("incidentId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_sourceEntityId_occurredAt_idx" ON "FinancialTransaction"("sourceEntityId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_destinationEntityId_occurredAt_idx" ON "FinancialTransaction"("destinationEntityId", "occurredAt");

-- AddForeignKey
ALTER TABLE "CommunicationRecord" ADD CONSTRAINT "CommunicationRecord_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecord" ADD CONSTRAINT "CommunicationRecord_destinationEntityId_fkey" FOREIGN KEY ("destinationEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecord" ADD CONSTRAINT "CommunicationRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecord" ADD CONSTRAINT "CommunicationRecord_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecord" ADD CONSTRAINT "CommunicationRecord_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecord" ADD CONSTRAINT "CommunicationRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_destinationEntityId_fkey" FOREIGN KEY ("destinationEntityId") REFERENCES "GraphEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
