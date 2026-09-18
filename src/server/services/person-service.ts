import type { Actor } from "@/domain/auth";
import { NotFoundError } from "@/domain/errors";
import {
  casePersonInputSchema,
  type CaseParticipant,
  type CasePersonInput,
  type PersonProfile,
  type PersonReference,
} from "@/domain/person";
import { assertCan } from "@/server/authorization/policy";
import type { PersonRepository } from "@/server/repositories/person-repository";
import { PrismaPersonRepository } from "@/server/repositories/prisma-person-repository";

export class PersonService {
  constructor(private readonly repository: PersonRepository) {}

  async getPersonProfile(actor: Actor, personId: string): Promise<PersonProfile> {
    assertCan(actor, "CASE_VIEW");
    const profile = await this.repository.findProfileForActor(actor, personId);
    if (!profile) throw new NotFoundError();
    return profile;
  }

  async listCasePeople(actor: Actor, caseId: string): Promise<CaseParticipant[]> {
    assertCan(actor, "CASE_VIEW");
    const people = await this.repository.listForCase(actor, caseId);
    if (!people) throw new NotFoundError();
    return people;
  }

  async listAssociationCandidates(actor: Actor, caseId: string): Promise<PersonReference[]> {
    assertCan(actor, "PERSON_ASSOCIATE");
    const people = await this.repository.listAssociationCandidates(actor, caseId);
    if (!people) throw new NotFoundError();
    return people;
  }

  async associatePerson(actor: Actor, input: CasePersonInput): Promise<CaseParticipant> {
    assertCan(actor, "PERSON_ASSOCIATE");
    return this.repository.associateWithCase(actor, casePersonInputSchema.parse(input));
  }
}

const personService = new PersonService(new PrismaPersonRepository());

export const getPersonProfile = personService.getPersonProfile.bind(personService);
export const listCasePeople = personService.listCasePeople.bind(personService);
export const listAssociationCandidates = personService.listAssociationCandidates.bind(personService);
export const associatePerson = personService.associatePerson.bind(personService);
