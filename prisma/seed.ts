import { pathToFileURL } from "node:url";
import { hash, argon2id, type HashOptions } from "argon2";
import {
  CaseParticipation,
  CaseStatus,
  CommunicationDirection,
  CommunicationType,
  EvidenceConfidence,
  GraphEntityType,
  IncidentParticipation,
  IncidentStatus,
  IncidentSubmissionStatus,
  IncidentType,
  IncidentVerificationLevel,
  FinancialTransactionType,
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
    deviceCorrelation: "30000000-0000-4000-8000-000000000003",
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
    arjunDeviceCorrelation: "41000000-0000-4000-8000-000000000005",
  },
  evidence: {
    callSummary: "50000000-0000-4000-8000-000000000001",
    transactionLedger: "50000000-0000-4000-8000-000000000002",
    deviceMetadata: "50000000-0000-4000-8000-000000000003",
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
    vehicle: "60000000-0000-4000-8000-000000000009",
    device: "60000000-0000-4000-8000-000000000010",
    location: "60000000-0000-4000-8000-000000000011",
  },
  relationships: {
    usesPhone: "70000000-0000-4000-8000-000000000001",
    controlsAccount: "70000000-0000-4000-8000-000000000002",
    associatedVehicle: "70000000-0000-4000-8000-000000000003",
    observedAtLocation: "70000000-0000-4000-8000-000000000004",
    proposedDevice: "70000000-0000-4000-8000-000000000005",
  },
  relationshipEvidence: {
    phone: "71000000-0000-4000-8000-000000000001",
    account: "71000000-0000-4000-8000-000000000002",
    vehicle: "71000000-0000-4000-8000-000000000003",
    location: "71000000-0000-4000-8000-000000000004",
  },
  incidents: {
    kioskMeeting: "80000000-0000-4000-8000-000000000001",
    transferObservation: "80000000-0000-4000-8000-000000000002",
    investigatorLead: "80000000-0000-4000-8000-000000000003",
  },
  incidentParticipants: {
    arjun: "81000000-0000-4000-8000-000000000001",
    meera: "81000000-0000-4000-8000-000000000002",
    kabir: "81000000-0000-4000-8000-000000000003",
  },
  incidentEvidence: {
    kiosk: "82000000-0000-4000-8000-000000000001",
    transfer: "82000000-0000-4000-8000-000000000002",
  },
  incidentEntities: {
    kioskMeeting: "83000000-0000-4000-8000-000000000001",
    transferObservation: "83000000-0000-4000-8000-000000000002",
    investigatorLead: "83000000-0000-4000-8000-000000000003",
  },
  communications: {
    baselineOne: "90000000-0000-4000-8000-000000000001",
    baselineTwo: "90000000-0000-4000-8000-000000000002",
    baselineThree: "90000000-0000-4000-8000-000000000003",
    spikeOne: "90000000-0000-4000-8000-000000000004",
    spikeTwo: "90000000-0000-4000-8000-000000000005",
    spikeThree: "90000000-0000-4000-8000-000000000006",
    spikeFour: "90000000-0000-4000-8000-000000000007",
    spikeFive: "90000000-0000-4000-8000-000000000008",
    spikeSix: "90000000-0000-4000-8000-000000000009",
    spikeSeven: "90000000-0000-4000-8000-000000000010",
    spikeEight: "90000000-0000-4000-8000-000000000011",
    spikeNine: "90000000-0000-4000-8000-000000000012",
    spikeTen: "90000000-0000-4000-8000-000000000013",
    spikeEleven: "90000000-0000-4000-8000-000000000014",
    spikeTwelve: "90000000-0000-4000-8000-000000000015",
    newDevice: "90000000-0000-4000-8000-000000000016",
  },
  transactions: {
    baselineOne: "91000000-0000-4000-8000-000000000001",
    baselineTwo: "91000000-0000-4000-8000-000000000002",
    baselineThree: "91000000-0000-4000-8000-000000000003",
    exceptional: "91000000-0000-4000-8000-000000000004",
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
      where: { id: ids.cases.deviceCorrelation },
      update: { firNumber: "FIR-109", caseNumber: "CCU-2026-109", title: "Shared device correlation review", category: "Cyber fraud", occurredAt: new Date("2026-08-17T08:20:00.000Z"), occurrenceLocation: "Bengaluru, Karnataka", status: CaseStatus.OPEN, description: "Synthetic separate case used to demonstrate authorized cross-case device context.", departmentId: ids.departments.cyber, investigatingOfficerId: ids.users.departmentUser },
      create: { id: ids.cases.deviceCorrelation, firNumber: "FIR-109", caseNumber: "CCU-2026-109", title: "Shared device correlation review", category: "Cyber fraud", occurredAt: new Date("2026-08-17T08:20:00.000Z"), occurrenceLocation: "Bengaluru, Karnataka", status: CaseStatus.OPEN, description: "Synthetic separate case used to demonstrate authorized cross-case device context.", departmentId: ids.departments.cyber, investigatingOfficerId: ids.users.departmentUser },
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
    { id: ids.casePeople.arjunDeviceCorrelation, caseId: ids.cases.deviceCorrelation, personId: ids.people.arjun, participation: CaseParticipation.SUSPECT, notes: "Synthetic cross-case device context." },
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
      where: { id: ids.evidence.deviceMetadata },
      update: { caseId: ids.cases.deviceCorrelation, uploadedById: ids.users.departmentUser, departmentId: ids.departments.cyber, originalFilename: "synthetic-device-metadata.csv", mediaType: "text/csv", byteSize: 1536, checksumSha256: "3333333333333333333333333333333333333333333333333333333333333333", storageKey: "seed/ccu/synthetic-device-metadata.csv", description: "Metadata-only synthetic device context; no evidence bytes are committed.", verificationState: VerificationState.PENDING },
      create: { id: ids.evidence.deviceMetadata, caseId: ids.cases.deviceCorrelation, uploadedById: ids.users.departmentUser, departmentId: ids.departments.cyber, originalFilename: "synthetic-device-metadata.csv", mediaType: "text/csv", byteSize: 1536, checksumSha256: "3333333333333333333333333333333333333333333333333333333333333333", storageKey: "seed/ccu/synthetic-device-metadata.csv", description: "Metadata-only synthetic device context; no evidence bytes are committed.", verificationState: VerificationState.PENDING },
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
    {
      id: ids.entities.vehicle,
      entityType: GraphEntityType.VEHICLE,
      displayLabel: "KA 01 SYN 108",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.cyber,
      personId: null,
      caseId: null,
      canonicalReference: "vehicle:SYN-KA01-108",
    },
    {
      id: ids.entities.device,
      entityType: GraphEntityType.DEVICE,
      displayLabel: "Synthetic handset D-108",
      verificationState: VerificationState.PENDING,
      departmentId: ids.departments.cyber,
      personId: null,
      caseId: null,
      canonicalReference: "device:SYN-D-108",
    },
    {
      id: ids.entities.location,
      entityType: GraphEntityType.LOCATION,
      displayLabel: "Synthetic service kiosk, Bengaluru",
      verificationState: VerificationState.VERIFIED,
      departmentId: ids.departments.cyber,
      personId: null,
      caseId: null,
      canonicalReference: "location:SYN-BLR-KIOSK-01",
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
        interactionCount: 14,
        interactionSummary: "Subscriber linkage confirmed by synthetic call metadata.",
        startsAt: new Date("2026-08-12T09:30:00.000Z"),
        endsAt: new Date("2026-08-18T16:10:00.000Z"),
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
        interactionCount: 14,
        interactionSummary: "Subscriber linkage confirmed by synthetic call metadata.",
        startsAt: new Date("2026-08-12T09:30:00.000Z"),
        endsAt: new Date("2026-08-18T16:10:00.000Z"),
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
        interactionCount: 8,
        interactionSummary: "Control linkage confirmed by synthetic transaction metadata.",
        startsAt: new Date("2026-08-19T13:45:00.000Z"),
        endsAt: new Date("2026-08-22T08:15:00.000Z"),
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
        interactionCount: 8,
        interactionSummary: "Control linkage confirmed by synthetic transaction metadata.",
        startsAt: new Date("2026-08-19T13:45:00.000Z"),
        endsAt: new Date("2026-08-22T08:15:00.000Z"),
        departmentId: ids.departments.financial,
        createdById: ids.users.investigator,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-02T11:15:00.000Z"),
      },
    }),
    prisma.graphRelationship.upsert({
      where: { id: ids.relationships.associatedVehicle },
      update: {
        sourceEntityId: ids.entities.arjun,
        targetEntityId: ids.entities.vehicle,
        relationshipType: "ASSOCIATED_WITH",
        strength: RelationshipStrength.SECONDARY,
        evidenceConfidence: EvidenceConfidence.PROBABLE,
        verificationState: VerificationState.VERIFIED,
        interactionCount: 3,
        interactionSummary: "Observed association in synthetic records; frequency is not proof of criminal involvement.",
        startsAt: new Date("2026-08-13T10:20:00.000Z"),
        endsAt: new Date("2026-08-16T12:05:00.000Z"),
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-03T09:30:00.000Z"),
      },
      create: {
        id: ids.relationships.associatedVehicle,
        sourceEntityId: ids.entities.arjun,
        targetEntityId: ids.entities.vehicle,
        relationshipType: "ASSOCIATED_WITH",
        strength: RelationshipStrength.SECONDARY,
        evidenceConfidence: EvidenceConfidence.PROBABLE,
        verificationState: VerificationState.VERIFIED,
        interactionCount: 3,
        interactionSummary: "Observed association in synthetic records; frequency is not proof of criminal involvement.",
        startsAt: new Date("2026-08-13T10:20:00.000Z"),
        endsAt: new Date("2026-08-16T12:05:00.000Z"),
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-03T09:30:00.000Z"),
      },
    }),
    prisma.graphRelationship.upsert({
      where: { id: ids.relationships.observedAtLocation },
      update: {
        sourceEntityId: ids.entities.vehicle,
        targetEntityId: ids.entities.location,
        relationshipType: "OBSERVED_AT",
        strength: RelationshipStrength.TERTIARY,
        evidenceConfidence: EvidenceConfidence.PROBABLE,
        verificationState: VerificationState.VERIFIED,
        interactionCount: 1,
        interactionSummary: "Single synthetic observation associated the vehicle with this location.",
        startsAt: new Date("2026-08-16T12:05:00.000Z"),
        endsAt: new Date("2026-08-16T12:05:00.000Z"),
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-03T09:45:00.000Z"),
      },
      create: {
        id: ids.relationships.observedAtLocation,
        sourceEntityId: ids.entities.vehicle,
        targetEntityId: ids.entities.location,
        relationshipType: "OBSERVED_AT",
        strength: RelationshipStrength.TERTIARY,
        evidenceConfidence: EvidenceConfidence.PROBABLE,
        verificationState: VerificationState.VERIFIED,
        interactionCount: 1,
        interactionSummary: "Single synthetic observation associated the vehicle with this location.",
        startsAt: new Date("2026-08-16T12:05:00.000Z"),
        endsAt: new Date("2026-08-16T12:05:00.000Z"),
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: ids.users.administrator,
        verifiedAt: new Date("2026-09-03T09:45:00.000Z"),
      },
    }),
    prisma.graphRelationship.upsert({
      where: { id: ids.relationships.proposedDevice },
      update: {
        sourceEntityId: ids.entities.arjun,
        targetEntityId: ids.entities.device,
        relationshipType: "MAY_USE",
        strength: RelationshipStrength.PRIMARY,
        evidenceConfidence: EvidenceConfidence.UNVERIFIED,
        verificationState: VerificationState.PENDING,
        interactionCount: 2,
        interactionSummary: "Synthetic lead awaiting administrative review.",
        startsAt: new Date("2026-08-17T08:20:00.000Z"),
        endsAt: new Date("2026-08-17T09:10:00.000Z"),
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: null,
        verifiedAt: null,
      },
      create: {
        id: ids.relationships.proposedDevice,
        sourceEntityId: ids.entities.arjun,
        targetEntityId: ids.entities.device,
        relationshipType: "MAY_USE",
        strength: RelationshipStrength.PRIMARY,
        evidenceConfidence: EvidenceConfidence.UNVERIFIED,
        verificationState: VerificationState.PENDING,
        interactionCount: 2,
        interactionSummary: "Synthetic lead awaiting administrative review.",
        startsAt: new Date("2026-08-17T08:20:00.000Z"),
        endsAt: new Date("2026-08-17T09:10:00.000Z"),
        departmentId: ids.departments.cyber,
        createdById: ids.users.departmentUser,
        verifiedById: null,
        verifiedAt: null,
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
    prisma.relationshipEvidence.upsert({
      where: { id: ids.relationshipEvidence.vehicle },
      update: {
        relationshipId: ids.relationships.associatedVehicle,
        evidenceId: ids.evidence.callSummary,
        sourceCaseId: ids.cases.accountTakeover,
        note: "Synthetic observation provenance for the vehicle association.",
      },
      create: {
        id: ids.relationshipEvidence.vehicle,
        relationshipId: ids.relationships.associatedVehicle,
        evidenceId: ids.evidence.callSummary,
        sourceCaseId: ids.cases.accountTakeover,
        note: "Synthetic observation provenance for the vehicle association.",
      },
    }),
    prisma.relationshipEvidence.upsert({
      where: { id: ids.relationshipEvidence.location },
      update: {
        relationshipId: ids.relationships.observedAtLocation,
        evidenceId: ids.evidence.callSummary,
        sourceCaseId: ids.cases.accountTakeover,
        note: "Synthetic location observation provenance.",
      },
      create: {
        id: ids.relationshipEvidence.location,
        relationshipId: ids.relationships.observedAtLocation,
        evidenceId: ids.evidence.callSummary,
        sourceCaseId: ids.cases.accountTakeover,
        note: "Synthetic location observation provenance.",
      },
    }),
  ]);

  const incidents = [
    {
      id: ids.incidents.kioskMeeting, incidentNumber: "INC-108", incidentType: IncidentType.MEETING, title: "Service kiosk meeting observed",
      description: "Synthetic observation of an in-person meeting near the service kiosk. The record does not itself establish unlawful activity.", occurredAt: new Date("2026-08-16T12:05:00.000Z"), location: "Synthetic service kiosk, Bengaluru",
      status: IncidentStatus.ACTIVE, submissionStatus: IncidentSubmissionStatus.ACCEPTED, verificationLevel: IncidentVerificationLevel.DEPARTMENT_VERIFIED,
      departmentId: ids.departments.cyber, caseId: ids.cases.accountTakeover, submittedById: ids.users.departmentUser, departmentVerifiedById: ids.users.departmentUser, departmentVerifiedAt: new Date("2026-08-18T10:00:00.000Z"), crossVerifiedById: null, crossVerifiedAt: null, reviewReason: "Validated against synthetic call and observation material.",
    },
    {
      id: ids.incidents.transferObservation, incidentNumber: "INC-212", incidentType: IncidentType.TRANSACTION, title: "High-velocity transfer observation",
      description: "Synthetic transaction-related event retained for later incident-window comparison; it is not an automated criminality finding.", occurredAt: new Date("2026-08-19T13:45:00.000Z"), location: "Mumbai, Maharashtra",
      status: IncidentStatus.OPEN, submissionStatus: IncidentSubmissionStatus.ACCEPTED, verificationLevel: IncidentVerificationLevel.CROSS_VERIFIED,
      departmentId: ids.departments.financial, caseId: ids.cases.muleNetwork, submittedById: ids.users.investigator, departmentVerifiedById: ids.users.administrator, departmentVerifiedAt: new Date("2026-08-20T09:00:00.000Z"), crossVerifiedById: ids.users.administrator, crossVerifiedAt: new Date("2026-08-22T09:00:00.000Z"), reviewReason: "Cross-department synthetic verification completed.",
    },
    {
      id: ids.incidents.investigatorLead, incidentNumber: "INC-213", incidentType: IncidentType.SUSPICIOUS_EVENT, title: "New contact observation submitted for review",
      description: "Synthetic investigator submission demonstrating the pending department review workflow.", occurredAt: new Date("2026-08-18T15:20:00.000Z"), location: "Mumbai, Maharashtra",
      status: IncidentStatus.OPEN, submissionStatus: IncidentSubmissionStatus.PENDING_REVIEW, verificationLevel: IncidentVerificationLevel.UNVERIFIED,
      departmentId: ids.departments.financial, caseId: ids.cases.muleNetwork, submittedById: ids.users.investigator, departmentVerifiedById: null, departmentVerifiedAt: null, crossVerifiedById: null, crossVerifiedAt: null, reviewReason: null,
    },
  ] as const;
  for (const incident of incidents) await prisma.incident.upsert({ where: { id: incident.id }, update: incident, create: incident });

  const incidentEntities = [
    { id: ids.incidentEntities.kioskMeeting, incidentId: ids.incidents.kioskMeeting, displayLabel: "INC-108", departmentId: ids.departments.cyber, verificationState: VerificationState.VERIFIED },
    { id: ids.incidentEntities.transferObservation, incidentId: ids.incidents.transferObservation, displayLabel: "INC-212", departmentId: ids.departments.financial, verificationState: VerificationState.VERIFIED },
    { id: ids.incidentEntities.investigatorLead, incidentId: ids.incidents.investigatorLead, displayLabel: "INC-213", departmentId: ids.departments.financial, verificationState: VerificationState.PENDING },
  ] as const;
  for (const entity of incidentEntities) await prisma.graphEntity.upsert({ where: { id: entity.id }, update: { ...entity, entityType: GraphEntityType.INCIDENT, canonicalReference: `incident:${entity.displayLabel}`, personId: null, caseId: null }, create: { ...entity, entityType: GraphEntityType.INCIDENT, canonicalReference: `incident:${entity.displayLabel}`, personId: null, caseId: null } });

  const participants = [
    { id: ids.incidentParticipants.arjun, incidentId: ids.incidents.kioskMeeting, personId: ids.people.arjun, graphEntityId: null, participation: IncidentParticipation.SUSPECT, notes: "Synthetic participant link." },
    { id: ids.incidentParticipants.meera, incidentId: ids.incidents.kioskMeeting, personId: ids.people.meera, graphEntityId: null, participation: IncidentParticipation.WITNESS, notes: "Synthetic participant link." },
    { id: ids.incidentParticipants.kabir, incidentId: ids.incidents.transferObservation, personId: ids.people.kabir, graphEntityId: null, participation: IncidentParticipation.ACCUSED, notes: "Synthetic participant link." },
  ] as const;
  for (const participant of participants) await prisma.incidentParticipant.upsert({ where: { id: participant.id }, update: participant, create: participant });
  const incidentEvidence = [
    { id: ids.incidentEvidence.kiosk, incidentId: ids.incidents.kioskMeeting, evidenceId: ids.evidence.callSummary, note: "Synthetic kiosk observation source." },
    { id: ids.incidentEvidence.transfer, incidentId: ids.incidents.transferObservation, evidenceId: ids.evidence.transactionLedger, note: "Synthetic transfer observation source." },
  ] as const;
  for (const source of incidentEvidence) await prisma.incidentEvidence.upsert({ where: { id: source.id }, update: source, create: source });

  const communicationTimes = [
    "2026-08-03T09:15:00.000Z", "2026-08-05T15:40:00.000Z", "2026-08-07T10:05:00.000Z",
    "2026-08-15T08:10:00.000Z", "2026-08-15T09:35:00.000Z", "2026-08-15T11:05:00.000Z", "2026-08-15T12:20:00.000Z", "2026-08-15T14:55:00.000Z", "2026-08-15T17:10:00.000Z",
    "2026-08-16T07:45:00.000Z", "2026-08-16T09:00:00.000Z", "2026-08-16T10:25:00.000Z", "2026-08-16T13:10:00.000Z", "2026-08-16T15:05:00.000Z", "2026-08-16T16:40:00.000Z",
  ];
  const communicationIds = [
    ids.communications.baselineOne, ids.communications.baselineTwo, ids.communications.baselineThree,
    ids.communications.spikeOne, ids.communications.spikeTwo, ids.communications.spikeThree, ids.communications.spikeFour, ids.communications.spikeFive, ids.communications.spikeSix,
    ids.communications.spikeSeven, ids.communications.spikeEight, ids.communications.spikeNine, ids.communications.spikeTen, ids.communications.spikeEleven, ids.communications.spikeTwelve,
  ];
  for (const [index, id] of communicationIds.entries()) {
    const record = {
      id, communicationNumber: `COM-108-${String(index + 1).padStart(3, "0")}`, communicationType: CommunicationType.CALL,
      occurredAt: new Date(communicationTimes[index]!), sourceEntityId: ids.entities.arjun, destinationEntityId: index === 14 ? ids.entities.device : ids.entities.meera,
      sourceIdentifier: "+91 90000 00108", destinationIdentifier: "+91 90000 00109", durationSeconds: 90 + index * 15,
      direction: CommunicationDirection.BIDIRECTIONAL, caseId: ids.cases.accountTakeover, incidentId: ids.incidents.kioskMeeting,
      sourceEvidenceId: ids.evidence.callSummary, departmentId: ids.departments.cyber, verificationLevel: IncidentVerificationLevel.DEPARTMENT_VERIFIED,
    };
    await prisma.communicationRecord.upsert({ where: { id }, update: record, create: record });
  }
  const newDeviceCommunication = {
    id: ids.communications.newDevice, communicationNumber: "COM-109-001", communicationType: CommunicationType.DIGITAL_CONTACT,
    occurredAt: new Date("2026-08-17T08:40:00.000Z"), sourceEntityId: ids.entities.arjun, destinationEntityId: ids.entities.device,
    sourceIdentifier: "+91 90000 00108", destinationIdentifier: "SYN-D-108", durationSeconds: null, direction: CommunicationDirection.UNKNOWN,
    caseId: ids.cases.deviceCorrelation, incidentId: null, sourceEvidenceId: ids.evidence.deviceMetadata, departmentId: ids.departments.cyber, verificationLevel: IncidentVerificationLevel.UNVERIFIED,
  };
  await prisma.communicationRecord.upsert({ where: { id: newDeviceCommunication.id }, update: newDeviceCommunication, create: newDeviceCommunication });

  const transactions = [
    { id: ids.transactions.baselineOne, transactionNumber: "TXN-212-001", occurredAt: new Date("2026-08-07T10:00:00.000Z"), amount: 10_000 },
    { id: ids.transactions.baselineTwo, transactionNumber: "TXN-212-002", occurredAt: new Date("2026-08-09T10:00:00.000Z"), amount: 18_500 },
    { id: ids.transactions.baselineThree, transactionNumber: "TXN-212-003", occurredAt: new Date("2026-08-11T10:00:00.000Z"), amount: 25_000 },
    { id: ids.transactions.exceptional, transactionNumber: "TXN-212-004", occurredAt: new Date("2026-08-19T13:45:00.000Z"), amount: 480_000 },
  ];
  for (const transaction of transactions) {
    const record = { ...transaction, transactionType: FinancialTransactionType.TRANSFER, sourceEntityId: ids.entities.kabir, destinationEntityId: ids.entities.bankAccount, currency: "INR", caseId: ids.cases.muleNetwork, incidentId: ids.incidents.transferObservation, sourceEvidenceId: ids.evidence.transactionLedger, departmentId: ids.departments.financial, verificationLevel: IncidentVerificationLevel.CROSS_VERIFIED };
    await prisma.financialTransaction.upsert({ where: { id: record.id }, update: record, create: record });
  }

  console.info(
    "Seeded deterministic NexusTrace demo data: 3 departments, 3 users, 3 cases, 4 people, 3 evidence records, 3 incidents, 16 communications, 4 transactions, 14 graph entities, and 5 relationships.",
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
