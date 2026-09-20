-- PostgreSQL remains authoritative. This outbox makes graph projection
-- asynchronous, observable, and safely retryable after a Neo4j outage.
CREATE TABLE "GraphProjectionEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aggregateType" TEXT NOT NULL,
  "aggregateId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "requestedById" UUID,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GraphProjectionEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GraphProjectionEvent_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "GraphProjectionEvent_processedAt_availableAt_idx"
  ON "GraphProjectionEvent"("processedAt", "availableAt");
CREATE INDEX "GraphProjectionEvent_aggregateType_aggregateId_idx"
  ON "GraphProjectionEvent"("aggregateType", "aggregateId");
