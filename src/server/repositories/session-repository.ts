import type { UserRole } from "@/domain/model";

export interface PersistedSessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  departmentId: string;
  active: boolean;
}

export interface PersistedSession {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  user: PersistedSessionUser;
}

export interface CreateSessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

export interface SessionRepository {
  create(input: CreateSessionRecord): Promise<PersistedSession>;
  findByTokenHash(tokenHash: string): Promise<PersistedSession | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}
