// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole, VerificationState } from "@/domain/model";
import { getCurrentActor } from "@/server/auth/session";
import { openEvidence } from "@/server/services/evidence-service";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/server/services/evidence-service", () => ({ openEvidence: vi.fn() }));

const actor = {
  userId: "department-user",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "cyber",
};

describe("evidence retrieval route", () => {
  beforeEach(() => {
    vi.mocked(getCurrentActor).mockResolvedValue(actor);
  });

  it("requires an authenticated session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValueOnce(null);
    const response = await GET(new Request("http://localhost/api/evidence/one"), {
      params: Promise.resolve({ evidenceId: "one" }),
    });

    expect(response.status).toBe(401);
    expect(openEvidence).not.toHaveBeenCalled();
  });

  it("streams authorized bytes with safe download headers", async () => {
    vi.mocked(openEvidence).mockResolvedValueOnce({
      record: {
        id: "evidence-1",
        caseId: "case-1",
        originalFilename: "Call-Summary.csv",
        mediaType: "text/csv",
        byteSize: 5,
        checksumSha256: "a".repeat(64),
        storageKey: "private-key.csv",
        description: null,
        verificationState: VerificationState.Pending,
        uploadedAt: new Date("2026-09-18T00:00:00.000Z"),
        uploadedByName: "Dev Malhotra",
      },
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("hello"));
          controller.close();
        },
      }),
    });

    const response = await GET(new Request("http://localhost/api/evidence/evidence-1"), {
      params: Promise.resolve({ evidenceId: "evidence-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("Call-Summary.csv");
    expect(await response.text()).toBe("hello");
  });
});
