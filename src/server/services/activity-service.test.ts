import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { CommunicationDirection, CommunicationType, FinancialTransactionType, IncidentVerificationLevel, UserRole } from "@/domain/model";
import type { ActivityRepository } from "@/server/repositories/activity-repository";
import { ActivityService } from "./activity-service";

const actor: Actor = { userId: "20000000-0000-4000-8000-000000000002", email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: "10000000-0000-4000-8000-000000000002" };
const ids = { source: "60000000-0000-4000-8000-000000000001", target: "60000000-0000-4000-8000-000000000002" };
function repository(): ActivityRepository { return { createCommunication: vi.fn(), createFinancialTransaction: vi.fn() }; }

describe("ActivityService", () => {
  it("allows department users to create validated, auditable canonical activity", async () => {
    const store = repository(); vi.mocked(store.createCommunication).mockResolvedValue({ id: "record", recordNumber: "COM-001" } as never);
    await new ActivityService(store).createCommunication(actor, { communicationNumber: "com-001", communicationType: CommunicationType.Call, occurredAt: new Date(), sourceEntityId: ids.source, destinationEntityId: ids.target, direction: CommunicationDirection.Bidirectional, verificationLevel: IncidentVerificationLevel.DepartmentVerified });
    expect(store.createCommunication).toHaveBeenCalledWith(actor, expect.objectContaining({ communicationNumber: "COM-001" }));
  });
  it("prevents investigators from creating canonical communication or financial records", async () => {
    const investigator = { ...actor, role: UserRole.Investigator };
    const service = new ActivityService(repository());
    await expect(service.createCommunication(investigator, { communicationNumber: "COM-001", communicationType: CommunicationType.Call, occurredAt: new Date(), sourceEntityId: ids.source, destinationEntityId: ids.target, direction: CommunicationDirection.Unknown, verificationLevel: IncidentVerificationLevel.Unverified })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.createFinancialTransaction(investigator, { transactionNumber: "TXN-001", transactionType: FinancialTransactionType.Transfer, occurredAt: new Date(), sourceEntityId: ids.source, destinationEntityId: ids.target, amount: 1000, currency: "INR", verificationLevel: IncidentVerificationLevel.Unverified })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
