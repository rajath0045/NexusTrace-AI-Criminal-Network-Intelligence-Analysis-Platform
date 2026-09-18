export type EntityClassification =
  | "person"
  | "organization"
  | "incident"
  | "location"
  | "device"
  | "account";

export type ThreatLevel = "critical" | "high" | "moderate" | "monitored";

export interface IntelligenceNode {
  id: string;
  label: string;
  classification: EntityClassification;
  coordinates: {
    lat: number;
    lon: number;
  };
  threatLevel: ThreatLevel;
  status: "active" | "flagged" | "intercepted" | "surveilled";
  caseReference?: string;
  details: string;
  confidenceScore: number;
}

export type ConnectionType =
  | "financial_conduit"
  | "c2_command"
  | "illicit_transit"
  | "encrypted_relay"
  | "syndicate_link";

export interface NetworkConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  strength: number; // 0.1 to 1.0
  activeTransmission: boolean;
  flowSpeed?: number;
}

export interface NetworkGlobeData {
  nodes: IntelligenceNode[];
  connections: NetworkConnection[];
  lastUpdated: string;
  systemPosture: string;
}
