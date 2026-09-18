import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerificationState } from "@/domain/model";
import { EvidenceList } from "./evidence-list";

describe("EvidenceList", () => {
  it("renders authenticated retrieval links for evidence records", () => {
    render(<EvidenceList evidence={[{
      id: "evidence-1",
      caseId: "case-1",
      originalFilename: "synthetic-call-summary.csv",
      mediaType: "text/csv",
      byteSize: 2048,
      checksumSha256: "a".repeat(64),
      storageKey: "hidden-storage-key",
      description: "Synthetic metadata.",
      verificationState: VerificationState.Verified,
      uploadedAt: new Date("2026-09-18T00:00:00.000Z"),
      uploadedByName: "Dev Malhotra",
    }]} />);

    const link = screen.getByRole("link", { name: /synthetic-call-summary.csv/i });
    expect(link).toHaveAttribute("href", "/api/evidence/evidence-1");
    expect(screen.queryByText("hidden-storage-key")).not.toBeInTheDocument();
  });
});
