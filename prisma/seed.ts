import { pathToFileURL } from "node:url";
import { hash, argon2id, type HashOptions } from "argon2";
import {
  CaseParticipation,
  CaseStatus,
  EvidenceConfidence,
  GraphEntityType,
  RelationshipStrength,
  UserRole,
  VerificationState,
} from "@prisma/client";
import { prisma } from "../src/server/db/client";

const ids = {
  departments: {
    headquarters: "10000000-0000-4000-8000-000000000001",
    cyber: "10000000-0000-4000-8000-000000000002",
    financial: "10000000-0000-4000-8000-000000000003",
  },
  users: {
    administrator: "20000000-0000-4000-8000-000000000001",
    departmentUser: "20000000-0000-4000-8000-000000000002",
    investigator: "20000000-0000-4000-8000-000000000003",
  },
  cases: {
    accountTakeover: "30000000-0000-4000-8000-000000000001",
    muleNetwork: "30000000-0000-4000-8000-000000000002",
  },
  people: {
    arjun: "40000000-0000-4000-8000-000000000001",
    meera: "40000000-0000-4000-8000-000000000002",
    kabir: "40000000-0000-4000-8000-000000000003",
    nisha: "40000000-0000-4000-8000-000000000004",
  },
  casePeople: {
    arjun: "41000000-0000-4000-8000-000000000001",
    meera: "41000000-0000-4000-8000-000000000002",
    kabir: "41000000-0000-4000-8000-000000000003",
    nisha: "41000000-0000-4000-8000-000000000004",
  },
  evidence: {
    callSummary: "50000000-0000-4000-8000-000000000001",
    transactionLedger: "50000000-0000-4000-8000-000000000002",
  },
  entities: {
    arjun: "60000000-0000-4000-8000-000000000001",
    meera: "60000000-0000-4000-8000-000000000002",
    kabir: "60000000-0000-4000-8000-000000000003",
    nisha: "60000000-0000-4000-8000-000000000004",
    accountTakeoverCase: "60000000-0000-4000-8000-000000000005",
    muleNetworkCase: "60000000-0000-4000-8000-000000000006",
    phone: "60000000-0000-4000-8000-000000000007",
    bankAccount: "60000000-0000-4000-8000-000000000008",
  },
  relationships: {
    usesPhone: "70000000-0000-4000-8000-000000000001",
    controlsAccount: "70000000-0000-4000-8000-000000000002",
  },
  relationshipEvidence: {
    phone: "71000000-0000-4000-8000-000000000001",
    account: "71000000-0000-4000-8000-000000000002",
  },
} as const;

const demoPassword = "NexusTraceDemo!2026";
const passwordOptions: HashOptions = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function seedSyntheticDemoData() {
  const [administratorPassword, departmentPassword, investigatorPassword] =
    await Promise.all([
      hash(demoPassword, {
        ...passwordOptions,
        salt: Buffer.from("nexus-admin-0001"),
      }),
      hash(demoPassword, {
        ...passwordOptions,
        salt: Buffer.from("nexus-dept--0002"),
      }),
      hash(demoPassword, {
        ...passwordOptions,
        salt: Buffer.from("nexus-invest-003"),
      }),
    ]);

  await prisma.$transaction([
    prisma.department.upsert({
      where: { id: ids.departments.headquarters },
      update: { code: "HQ", name: "National Intelligence Coordination" },
      create: {
        id: ids.departments.headquarters,
        code: "HQ",
        name: "National Intelligence Coordination",
      },
    }),
    prisma.department.upsert({
      where: { id: ids.departments.cyber },
      update: { code: "CCU", name: "Cyber Crime Unit" },
      create: {
        id: ids.departments.cyber,
        code: "CCU",
        name: "Cyber Crime Unit",
      },
    }),
    prisma.department.upsert({
      where: { id: ids.departments.financial },
      update: { code: "FIU", name: "Financial Intelligence Unit" },
      create: {
        id: ids.departments.financial,
        code: "FIU",
        name: "Financial Intelligence Unit",
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.user.upsert({
      where: { id: ids.users.administrator },
      update: {
        email: "admin@nexustrace.demo",
        displayName: "Aditi Rao",
        passwordHash: administratorPassword,
        role: UserRole.ADMINISTRATOR,
        active: true,
        departmentId: ids.departments.headquarters,
      },
      create: {
        id: ids.users.administrator,
        email: "admin@nexustrace.demo",
        displayName: "Aditi Rao",
        passwordHash: administratorPassword,
        role: UserRole.ADMINISTRATOR,
        departmentId: ids.departments.headquarters,
      },
    }),
    prisma.user.upsert({
      where: { id: ids.users.departmentUser },
      update: {
        email: "department@nexustrace.demo",
        displayName: "Dev Malhotra",
        passwordHash: departmentPassword,
        role: UserRole.DEPARTMENT_USER,
        active: true,
        departmentId: ids.departments.cyber,
      },
      create: {
        id: ids.users.departmentUser,
        email: "department@nexustrace.demo",
        displayName: "Dev Malhotra",
        passwordHash: departmentPassword,
        role: UserRole.DEPARTMENT_USER,
        departmentId: ids.departments.cyber,
      },
    }),
    prisma.user.upsert({
      where: { id: ids.users.investigator },
      update: {
        email: "investigator@nexustrace.demo",
        displayName: "Ishaan Sen",
        passwordHash: investigatorPassword,
        role: UserRole.INVESTIGATOR,
        active: true,
        departmentId: ids.departments.financial,
      },
      create: {
        id: ids.users.investigator,
        email: "investigator@nexustrace.demo",
        displayName: "Ishaan Sen",
        passwordHash: investigatorPassword,
        role: UserRole.INVESTIGATOR,
        departmentId: ids.departments.financial,
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.case.upsert({
      where: { id: ids.cases.accountTakeover },
      update: {
        firNumber: "FIR-108",
        caseNumber: "CCU-2026-108",
        title: "Coordinated account takeover reports",
        category: "Cyber fraud",
        occurredAt: new Date("2026-08-12T09:30:00.000Z"),
        occurrenceLocation: "Bengaluru, Karnataka",
        status: CaseStatus.ACTIVE,
        description:
          "Synthetic investigation into linked account takeover complaints.",
        departmentId: ids.departments.cyber,
        investigatingOfficerId: ids.users.departmentUser,
      },
      create: {
        id: ids.cases.accountTakeover,
        firNumber: "FIR-108",
        caseNumber: "CCU-2026-108",
        title: "Coordinated account takeover reports",
        category: "Cyber fraud",
        occurredAt: new Date("2026-08-12T09:30:00.000Z"),
        occurrenceLocation: "Bengaluru, Karnataka",
        status: CaseStatus.ACTIVE,
        description:
          "Synthetic investigation into linked account takeover complaints.",
        departmentId: ids.departments.cyber,
        investigatingOfficerId: ids.users.departmentUser,
      },
    }),
    prisma.case.upsert({
      where: { id: ids.cases.muleNetwork },
      update: {
        firNumber: "FIR-212",
        caseNumber: "FIU-2026-212",
        title: "Layered mule-account network",
        category: "Financial crime",
        occurredAt: new Date("2026-08-19T13:45:00.000Z"),
        occurrenceLocation: "Mumbai, Maharashtra",
        status: CaseStatus.OPEN,
        description:
          "Synthetic investigation into coordinated high-velocity transfers.",
        departmentId: ids.departments.financial,
        investigatingOfficerId: ids.users.investigator,
      },
      create: {
        id: ids.cases.muleNetwork,
        firNumber: "FIR-212",
        caseNumber: "FIU-2026-212",
        title: "Layered mule-account network",
        category: "Financial crime",
        occurredAt: new Date("2026-08-19T13:45:00.000Z"),
        occurrenceLocation: "Mumbai, Maharashtra",
        status: CaseStatus.OPEN,
        description:
          "Synthetic investigation into coordinated high-velocity transfers.",
        departmentId: ids.departments.financial,
        investigatingOfficerId: ids.users.investigator,
      },
    }),
  ]);

  const people = [
    {
      id: ids.people.arjun,
      givenName: "Arjun",
      familyName: "Mehta",
      aliases: ["A. Mehta"],
      dateOfBirth: new Date("1992-04-17T00:00:00.000Z"),
      gender: "Male",
      nationality: "Indian",
      identityData: { syntheticProfileId: "SYN-P-001" },
    },
    {
      id: ids.people.meera,
      givenName: "Meera",
      familyName: "Nair",
      aliases: [],
      dateOfBirth: new Date("1988-11-03T00:00:00.000Z"),
      gender: "Female",
      nationality: "Indian",
      identityData: { syntheticProfileId: "SYN-P-002" },
    },
    {
      id: ids.people.kabir,
      givenName: "Kabir",
      familyName: "Shah",
      aliases: ["K. Shah"],
      dateOfBirth: new Date("1995-02-21T00:00:00.000Z"),
      gender: "Male",
      nationality: "Indian",
      identityData: { syntheticProfileId: "SYN-P-003" },
    },
    {
      id: ids.people.nisha,
      givenName: "Nisha",
      familyName: "Kulkarni",
      aliases: [],
      dateOfBirth: new Date("1990-07-08T00:00:00.000Z"),
      gender: "Female",
      nationality: "Indian",
      identityData: { syntheticProfileId: "SYN-P-004" },
    },
  ];

  for (const person of people) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: person,
      create: person,
    });
  }

  const casePeople = [
    {
      id: ids.casePeople.arjun,
      caseId: ids.cases.accountTakeover,
      personId: ids.people.arjun,
      participation: CaseParticipation.SUSPECT,
      notes: "Linked through synthetic call-record metadata.",
    },
    {
      id: ids.casePeople.meera,
      caseId: ids.cases.accountTakeover,
      personId: ids.people.meera,
      participation: CaseParticipation.COMPLAINANT,
      notes: "Synthetic complainant profile.",
    },
    {
      id: ids.casePeople.kabir,
      caseId: ids.cases.muleNetwork,
      personId: ids.people.kabir,
      participation: CaseParticipation.SUSPECT,
      notes: "Linked through synthetic transaction metadata.",
    },
    {
      id: ids.casePeople.nisha,
      caseId: ids.cases.muleNetwork,
      personId: ids.people.nisha,
      participation: CaseParticipation.WITNESS,
      notes: "Synthetic witness profile.",
    },
  ] as const;

  for (const casePerson of casePeople) {
    await prisma.casePerson.upsert({
      where: { id: casePerson.id },
      update: casePerson,
      create: casePerson,
    });
  }

  await prisma.$transaction([
    prisma.evidence.upsert({
      where: { id: ids.evidence.callSummary },
      update: {
        caseId: ids.cases.accountTakeover,
        uploadedById: ids.users.departmentUser,
        departmentId: ids.departments.cyber,
        originalFilename: "synthetic-call-summary.csv",
        mediaType: "text/csv",
        byteSize: 2048,
        checksumSha256:
          "1111111111111111111111111111111111111111111111111111111111111111",
        storageKey: "seed/ccu/synthetic-call-summary.csv",
        description: "Metadata-only seed record; no evidence bytes are committed.",
        verificationState: VerificationState.VERIFIED,
      },
      create: {
        id: ids.evidence.callSummary,
        caseId: ids.cases.accountTakeover,
        uploadedById: ids.users.departmentUser,
        departmentId: ids.departments.cyber,
        originalFilename: "synthetic-call-summary.csv",
        mediaType: "text/csv",
        byteSize: 2048,
        checksumSha256:
          "1111111111111111111111111111111111111111111111111111111111111111",
        storageKey: "seed/ccu/synthetic-call-summary.csv",
        description: "Metadata-only seed record; no evidence bytes are committed.",
        verificationState: VerificationState.VERIFIED,
      },
    }),
    prisma.evidence.upsert({
      where: { id: ids.evidence.transactionLedger },
      update: {
        caseId: ids.cases.muleNetwork,
        uploadedById: ids.users.investigator,
        departmentId: ids.departments.financial,
        originalFilename: "synthetic-transaction-ledger.csv",
        mediaType: "text/csv",
        byteSize: 4096,
        checksumSha256:
          "2222222222222222222222222222222222222222222222222222222222222222",
        storageKey: "seed/fiu/synthetic-transaction-ledger.csv",
        description: "Metadata-only seed record; no evidence bytes are committed.",
        verificationState: VerificationState.VERIFIED,
      },
      create: {
        id: ids.evidence.transactionLedger,
        caseId: ids.cases.muleNetwork,
        uploadedById: ids.users.investigator,
        departmentId: ids.departments.financial,
        originalFilename: "synthetic-transaction-ledger.csv",
        mediaType: "text/csv",
        byteSize: 4096,
        checksumSha256:
          "2222222222222222222222222222222222222222222222222222222222222222",
        storageKey: "seed/fiu/synthetic-transaction-ledger.csv",
        description: "Metadata-only seed record; no evidence bytes are committed.",
        verificationState: VerificationState.VERIFIED,
      },
    }),
  ]);

  const entities = [
    {
      id: ids.entities.arjun,
      entityType: GraphEntityType.PERSON,
      displayLabel: "Arjun Mehta",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.cyber,
      personId: ids.people.arjun,
      caseId: null,
      canonicalReference: "person:SYN-P-001",
    },
    {
      id: ids.entities.meera,
      entityType: GraphEntityType.PERSON,
      displayLabel: "Meera Nair",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.cyber,
      personId: ids.people.meera,
      caseId: null,
      canonicalReference: "person:SYN-P-002",
    },
    {
      id: ids.entities.kabir,
      entityType: GraphEntityType.PERSON,
      displayLabel: "Kabir Shah",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.financial,
      personId: ids.people.kabir,
      caseId: null,
      canonicalReference: "person:SYN-P-003",
    },
    {
      id: ids.entities.nisha,
      entityType: GraphEntityType.PERSON,
      displayLabel: "Nisha Kulkarni",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.financial,
      personId: ids.people.nisha,
      caseId: null,
      canonicalReference: "person:SYN-P-004",
    },
    {
      id: ids.entities.accountTakeoverCase,
      entityType: GraphEntityType.CASE,
      displayLabel: "FIR-108",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.cyber,
      personId: null,
      caseId: ids.cases.accountTakeover,
      canonicalReference: "case:FIR-108",
    },
    {
      id: ids.entities.muleNetworkCase,
      entityType: GraphEntityType.CASE,
      displayLabel: "FIR-212",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.financial,
      personId: null,
      caseId: ids.cases.muleNetwork,
      canonicalReference: "case:FIR-212",
    },
    {
      id: ids.entities.phone,
      entityType: GraphEntityType.PHONE,
      displayLabel: "+91 90000 00108",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.cyber,
      personId: null,
      caseId: null,
      canonicalReference: "phone:+919000000108",
    },
    {
      id: ids.entities.bankAccount,
      entityType: GraphEntityType.BANK_ACCOUNT,
      displayLabel: "Synthetic account ••4212",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.financial,
      personId: null,
      caseId: null,
      canonicalReference: "bank-account:SYN-4212",
    },
  ] as const;

  for (const entity of entities) {
    await prisma.graphEntity.upsert({
      where: { id: entity.id },
      update: entity,
      create: entity,
    });
  }

  await prisma.$transaction([
    prisma.graphRelationship.upsert({
      where: { id: ids.relationships.usesPhone },
      update: {
        sourceEntityId: ids.entities.arjun,
        targetEntityId: ids.entities.phone,
        relationshipType: "USES",
        strength: RelationshipStrength.PRIMARY,
        evidenceConfidence: EvidenceConfidence.VERIFIED,
        verificationState: VerificationState.VERIFIED,
        interactionSummary: "Subscriber linkage confirmed by synthetic call metadata.",
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      create: {
        id: ids.relationships.usesPhone,
        sourceEntityId: ids.entities.arjun,
        targetEntityId: ids.entities.phone,
        relationshipType: "USES",
        strength: RelationshipStrength.PRIMARY,
        evidenceConfidence: EvidenceConfidence.VERIFIED,
        verificationState: VerificationState.VERIFIED,
        interactionSummary: "Subscriber linkage confirmed by synthetic call metadata.",
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-01T10:00:00.000Z"),
      },
    }),
    prisma.graphRelationship.upsert({
      where: { id: ids.relationships.controlsAccount },
      update: {
        sourceEntityId: ids.entities.kabir,
        targetEntityId: ids.entities.bankAccount,
        relationshipType: "CONTROLS",
        strength: RelationshipStrength.PRIMARY,
        evidenceConfidence: EvidenceConfidence.VERIFIED,
        verificationState: VerificationState.VERIFIED,
        interactionSummary: "Control linkage confirmed by synthetic transaction metadata.",
        departmentId: ids.departments.financial,
        createdById: ids.users.investigator,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-02T11:15:00.000Z"),
      },
      create: {
        id: ids.relationships.controlsAccount,
        sourceEntityId: ids.entities.kabir,
        targetEntityId: ids.entities.bankAccount,
        relationshipType: "CONTROLS",
        strength: RelationshipStrength.PRIMARY,
        evidenceConfidence: EvidenceConfidence.VERIFIED,
        verificationState: VerificationState.VERIFIED,
        interactionSummary: "Control linkage confirmed by synthetic transaction metadata.",
        departmentId: ids.departments.financial,
        createdById: ids.users.investigator,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-02T11:15:00.000Z"),
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.relationshipEvidence.upsert({
      where: { id: ids.relationshipEvidence.phone },
      update: {
        relationshipId: ids.relationships.usesPhone,
        evidenceId: ids.evidence.callSummary,
        sourceCaseId: ids.cases.accountTakeover,
        note: "Synthetic call-record provenance.",
      },
      create: {
        id: ids.relationshipEvidence.phone,
        relationshipId: ids.relationships.usesPhone,
        evidenceId: ids.evidence.callSummary,
        sourceCaseId: ids.cases.accountTakeover,
        note: "Synthetic call-record provenance.",
      },
    }),
    prisma.relationshipEvidence.upsert({
      where: { id: ids.relationshipEvidence.account },
      update: {
        relationshipId: ids.relationships.controlsAccount,
        evidenceId: ids.evidence.transactionLedger,
        sourceCaseId: ids.cases.muleNetwork,
        note: "Synthetic transaction-ledger provenance.",
      },
      create: {
        id: ids.relationshipEvidence.account,
        relationshipId: ids.relationships.controlsAccount,
        evidenceId: ids.evidence.transactionLedger,
        sourceCaseId: ids.cases.muleNetwork,
        note: "Synthetic transaction-ledger provenance.",
      },
    }),
  ]);

  console.info(
    "Seeded deterministic NexusTrace demo data: 3 departments, 3 users, 2 cases, 4 people, 2 evidence records, and 2 verified relationships.",
  );
}

const entryPoint = process.argv[1];

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  seedSyntheticDemoData()
    .catch((error: unknown) => {
      console.error("Failed to seed NexusTrace demo data.", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
