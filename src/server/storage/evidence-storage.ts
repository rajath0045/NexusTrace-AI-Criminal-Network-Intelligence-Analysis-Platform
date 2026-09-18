export interface EvidenceStoragePutInput {
  bytes: Uint8Array;
  originalFilename: string;
}

export interface EvidenceStorageOpenResult {
  stream: ReadableStream<Uint8Array>;
}

export interface EvidenceStorage {
  put(input: EvidenceStoragePutInput): Promise<{ storageKey: string }>;
  open(storageKey: string): Promise<EvidenceStorageOpenResult>;
  delete(storageKey: string): Promise<void>;
}
