import { UserRole as PrismaUserRole } from "@prisma/client";
import { UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type {
  CreateSessionRecord,
  PersistedSession,
  SessionRepository,
} from "./session-repository";

const userSelection = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  departmentId: true,
  active: true,
} as const;

function toDomainRole(role: PrismaUserRole): UserRole {
  return role as UserRole;
}

function toPersistedSession(session: {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: PrismaUserRole;
    departmentId: string;
    active: boolean;
  };
}): PersistedSession {
  return {
    ...session,
    user: {
      ...session.user,
      role: toDomainRole(session.user.role),
    },
  };
}

export class PrismaSessionRepository implements SessionRepository {
  async create(input: CreateSessionRecord): Promise<PersistedSession> {
    const session = await prisma.session.create({
      data: input,
      include: { user: { select: userSelection } },
    });

    return toPersistedSession(session);
  }

  async findByTokenHash(tokenHash: string): Promise<PersistedSession | null> {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: userSelection } },
    });

    return session ? toPersistedSession(session) : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
}
