import { UserRole } from "@/domain/model";
import type { Actor } from "@/domain/auth";
import type { GlobalSearchQuery, GlobalSearchResponse, GlobalSearchResult } from "@/domain/search";
import { prisma } from "@/server/db/client";
import type { SearchRepository } from "./search-repository";

const limit = 8;

function scope(actor: Actor) {
  return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId };
}

function group(type: GlobalSearchResult["type"], label: string, results: GlobalSearchResult[]) {
  return { type, label, results };
}

export class PrismaSearchRepository implements SearchRepository {
  async search(actor: Actor, query: GlobalSearchQuery): Promise<GlobalSearchResponse> {
    const text = query.q;
    const departmentScope = scope(actor);
    const [cases, people, incidents, entities] = await Promise.all([
      prisma.case.findMany({
        where: { ...departmentScope, OR: [
          { firNumber: { contains: text, mode: "insensitive" } },
          { caseNumber: { contains: text, mode: "insensitive" } },
          { title: { contains: text, mode: "insensitive" } },
        ] },
        select: { id: true, firNumber: true, title: true, status: true }, orderBy: { updatedAt: "desc" }, take: limit,
      }),
      prisma.person.findMany({
        where: { cases: { some: { case: { ...departmentScope } } }, OR: [
          { givenName: { contains: text, mode: "insensitive" } },
          { familyName: { contains: text, mode: "insensitive" } },
          { aliases: { has: text } },
        ] },
        select: { id: true, givenName: true, familyName: true, aliases: true }, orderBy: [{ familyName: "asc" }, { givenName: "asc" }], take: limit,
      }),
      prisma.incident.findMany({
        where: { ...departmentScope, OR: [
          { incidentNumber: { contains: text, mode: "insensitive" } },
          { title: { contains: text, mode: "insensitive" } },
        ] },
        select: { id: true, incidentNumber: true, title: true, verificationLevel: true }, orderBy: { occurredAt: "desc" }, take: limit,
      }),
      prisma.graphEntity.findMany({
        where: { ...departmentScope, OR: [
          { displayLabel: { contains: text, mode: "insensitive" } },
          { canonicalReference: { contains: text, mode: "insensitive" } },
        ] },
        select: { id: true, entityType: true, displayLabel: true, verificationState: true, personId: true, caseId: true, incidentId: true },
        orderBy: { updatedAt: "desc" }, take: limit,
      }),
    ]);

    const entityResults = entities.map((entity): GlobalSearchResult => ({
      id: entity.id, type: "ENTITY", title: entity.displayLabel,
      metadata: `${entity.entityType.replaceAll("_", " ")} · ${entity.verificationState.replaceAll("_", " ")}`,
      href: entity.personId ? `/people/${entity.personId}` : entity.caseId ? `/cases/${entity.caseId}` : entity.incidentId ? `/incidents/${entity.incidentId}` : `/network?focus=${entity.id}`,
    }));
    return {
      query: text,
      groups: [
        group("CASE", "Cases / FIRs", cases.map((record) => ({ id: record.id, type: "CASE", title: record.firNumber, metadata: `${record.title} · ${record.status}`, href: `/cases/${record.id}` }))),
        group("PERSON", "People", people.map((record) => ({ id: record.id, type: "PERSON", title: `${record.givenName} ${record.familyName}`, metadata: record.aliases.length ? `Also known as ${record.aliases.slice(0, 2).join(", ")}` : "Authorized person profile", href: `/people/${record.id}` }))),
        group("INCIDENT", "Incidents", incidents.map((record) => ({ id: record.id, type: "INCIDENT", title: record.incidentNumber, metadata: `${record.title} · ${record.verificationLevel.replaceAll("_", " ")}`, href: `/incidents/${record.id}` }))),
        group("ENTITY", "Network entities", entityResults),
      ].filter((entry) => entry.results.length > 0),
    };
  }
}
