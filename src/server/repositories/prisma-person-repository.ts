import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import { ConflictError, NotFoundError } from "@/domain/errors";
import {
  type CaseParticipant,
  type CasePersonInput,
  type PersonProfile,
  type PersonReference,
} from "@/domain/person";
import {
  CaseParticipation,
  CaseStatus,
  UserRole,
  VerificationState,
} from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { PersonRepository } from "./person-repository";

function actorCaseScope(actor: Actor): Prisma.CaseWhereInput {
  return actor.role === UserRole.Administrator
    ? {}
    : { departmentId: actor.departmentId };
}

function displayName(person: { givenName: string; familyName: string }): string {
  return `${person.givenName} ${person.familyName}`;
}

function toReference(person: {
  id: string;
  givenName: string;
  familyName: string;
  aliases: string[];
}): PersonReference {
  return {
    id: person.id,
    displayName: displayName(person),
    aliases: person.aliases,
  };
}

function identityReference(value: Prisma.JsonValue | null): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const reference = value.syntheticProfileId;
  return typeof reference === "string" ? reference : null;
}

export class PrismaPersonRepository implements PersonRepository {
  async findProfileForActor(actor: Actor, personId: string): Promise<PersonProfile | null> {
    const scope = actorCaseScope(actor);
    const person = await prisma.person.findFirst({
      where: { id: personId, cases: { some: { case: scope } } },
      include: {
        graphEntity: { select: { id: true } },
        cases: {
          where: { case: scope },
          include: {
            case: {
              include: {
                department: { select: { name: true } },
                evidence: {
                  select: {
                    id: true,
                    originalFilename: true,
                    mediaType: true,
                    verificationState: true,
                  },
                  orderBy: { createdAt: "desc" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!person) return null;

    return {
      id: person.id,
      givenName: person.givenName,
      familyName: person.familyName,
      displayName: displayName(person),
      aliases: person.aliases,
      dateOfBirth: person.dateOfBirth,
      gender: person.gender,
      nationality: person.nationality,
      identityReference: identityReference(person.identityData),
      graphFocusId: person.graphEntity?.id ?? null,
      cases: person.cases.map((association) => ({
        id: association.case.id,
        firNumber: association.case.firNumber,
        caseNumber: association.case.caseNumber,
        title: association.case.title,
        status: association.case.status as CaseStatus,
        departmentName: association.case.department.name,
        participation: association.participation as CaseParticipation,
        notes: association.notes,
      })),
      evidence: person.cases.flatMap((association) =>
        association.case.evidence.map((evidence) => ({
          id: evidence.id,
          caseId: association.case.id,
          originalFilename: evidence.originalFilename,
          mediaType: evidence.mediaType,
          verificationState: evidence.verificationState as VerificationState,
        })),
      ),
    };
  }

  async listForCase(actor: Actor, caseId: string): Promise<CaseParticipant[] | null> {
    const record = await prisma.case.findFirst({
      where: { id: caseId, ...actorCaseScope(actor) },
      include: {
        people: {
          include: { person: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!record) return null;
    return record.people.map((association) => ({
      ...toReference(association.person),
      associationId: association.id,
      participation: association.participation as CaseParticipation,
      notes: association.notes,
    }));
  }

  async listAssociationCandidates(
    actor: Actor,
    caseId: string,
  ): Promise<PersonReference[] | null> {
    const targetCase = await prisma.case.findFirst({
      where: { id: caseId, ...actorCaseScope(actor) },
      select: { id: true },
    });
    if (!targetCase) return null;

    const people = await prisma.person.findMany({
      where: { cases: { some: { case: actorCaseScope(actor) } } },
      orderBy: [{ familyName: "asc" }, { givenName: "asc" }],
    });
    return people.map(toReference);
  }

  async associateWithCase(actor: Actor, input: CasePersonInput): Promise<CaseParticipant> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const [targetCase, person] = await Promise.all([
          transaction.case.findFirst({
            where: { id: input.caseId, ...actorCaseScope(actor) },
            select: { id: true, departmentId: true },
          }),
          transaction.person.findFirst({
            where: {
              id: input.personId,
              cases: { some: { case: actorCaseScope(actor) } },
            },
          }),
        ]);

        if (!targetCase || !person) throw new NotFoundError();

        const association = await transaction.casePerson.create({
          data: {
            caseId: input.caseId,
            personId: input.personId,
            participation: input.participation,
            notes: input.notes ?? null,
          },
        });

        await transaction.auditEvent.create({
          data: {
            actorId: actor.userId,
            departmentId: targetCase.departmentId,
            action: "CASE_PERSON_ASSOCIATE",
            targetType: "PERSON",
            targetId: person.id,
            outcome: "SUCCESS",
            metadata: {
              caseId: targetCase.id,
              participation: input.participation,
            },
          },
        });

        return {
          ...toReference(person),
          associationId: association.id,
          participation: association.participation as CaseParticipation,
          notes: association.notes,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("This person already has that role in the case.");
      }
      throw error;
    }
  }
}
