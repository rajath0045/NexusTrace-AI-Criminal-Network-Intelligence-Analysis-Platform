import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, isAbsolute, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { StorageError } from "@/domain/errors";
import type {
  EvidenceStorage,
  EvidenceStorageOpenResult,
  EvidenceStoragePutInput,
} from "./evidence-storage";

export class LocalEvidenceStorage implements EvidenceStorage {
  private readonly root: string;

  constructor(
    root: string,
    private readonly createKey: () => string = randomUUID,
  ) {
    this.root = resolve(root);
  }

  private resolveKey(storageKey: string): string {
    if (!storageKey || isAbsolute(storageKey) || storageKey.split(/[\\/]/).includes("..")) {
      throw new StorageError("The evidence storage key is invalid.");
    }
    const candidate = resolve(this.root, storageKey);
    if (candidate !== this.root && !candidate.startsWith(`${this.root}${sep}`)) {
      throw new StorageError("The evidence storage key is outside the configured root.");
    }
    return candidate;
  }

  async put(input: EvidenceStoragePutInput): Promise<{ storageKey: string }> {
    const extension = extname(input.originalFilename).toLowerCase().slice(0, 12);
    const storageKey = `${this.createKey()}${extension}`;
    const path = this.resolveKey(storageKey);

    try {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      await writeFile(path, input.bytes, { flag: "wx", mode: 0o600 });
      return { storageKey };
    } catch (error) {
      throw new StorageError(error instanceof Error ? error.message : undefined);
    }
  }

  async open(storageKey: string): Promise<EvidenceStorageOpenResult> {
    const path = this.resolveKey(storageKey);
    try {
      await access(path);
      const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
      return { stream };
    } catch (error) {
      throw new StorageError(error instanceof Error ? error.message : undefined);
    }
  }

  async delete(storageKey: string): Promise<void> {
    const path = this.resolveKey(storageKey);
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new StorageError(error instanceof Error ? error.message : undefined);
      }
    }
  }
}
