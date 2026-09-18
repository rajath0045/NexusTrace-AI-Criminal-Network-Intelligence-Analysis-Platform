// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalEvidenceStorage } from "./local-evidence-storage";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("LocalEvidenceStorage", () => {
  it("uses a generated storage key rather than the supplied filename", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexustrace-evidence-"));
    roots.push(root);
    const storage = new LocalEvidenceStorage(root, () => "generated-evidence-id");

    const stored = await storage.put({
      bytes: new TextEncoder().encode("synthetic evidence"),
      originalFilename: "../../case-notes.csv",
    });
    const opened = await storage.open(stored.storageKey);
    const contents = await new Response(opened.stream).text();

    expect(stored.storageKey).toBe("generated-evidence-id.csv");
    expect(stored.storageKey).not.toContain("case-notes");
    expect(contents).toBe("synthetic evidence");
  });

  it("rejects traversal keys before reading from disk", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexustrace-evidence-"));
    roots.push(root);
    const storage = new LocalEvidenceStorage(root);

    await expect(storage.open("../outside.txt")).rejects.toMatchObject({ code: "STORAGE" });
  });
});
