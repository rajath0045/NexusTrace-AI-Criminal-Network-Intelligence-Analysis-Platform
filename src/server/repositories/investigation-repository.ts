import type { Actor } from "@/domain/auth";
import type { InvestigationQuery } from "@/domain/investigation";

export interface InvestigationActivityRecord {
  id: string;
  kind: "COMMUNICATION" | "FINANCIAL";
  occurredAt: Date;
  sourceEntityId: string;
  sourceLabel: string;
  destinationEntityId: string;
  destinationLabel: string;
  caseId: string | null;
  incidentId: string | null;
  sourceEvidenceId: string | null;
  verificationLevel: string;
  amount?: number;
  currency?: string;
  subtype: string;
}

export interface InvestigationRelationshipRecord {
  id: string;
  occurredAt: Date;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  verificationLevel: string;
  evidenceIds: string[];
}

export interface InvestigationContextData {
  person: { id: string; displayName: string; entityIds: string[] };
  incident: { id: string; incidentNumber: string; title: string; occurredAt: Date; departmentId: string };
  activities: InvestigationActivityRecord[];
  relationships: InvestigationRelationshipRecord[];
}

export interface InvestigationRepository {
  contextForActor(actor: Actor, query: InvestigationQuery): Promise<InvestigationContextData | null>;
}
