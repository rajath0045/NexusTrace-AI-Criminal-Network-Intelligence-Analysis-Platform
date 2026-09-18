import { IntelligenceNode, NetworkConnection, NetworkGlobeData } from "./types";

export const INITIAL_INTELLIGENCE_NODES: IntelligenceNode[] = [
  {
    id: "node-1",
    label: "Entity Apex-09",
    classification: "organization",
    coordinates: { lat: 40.7128, lon: -74.006 }, // New York
    threatLevel: "critical",
    status: "active",
    caseReference: "FIR-2026-NY01",
    details: "High-volume cross-border wire structuring hub with multi-layered bank fronts.",
    confidenceScore: 0.94,
  },
  {
    id: "node-2",
    label: "Asset Conduit 44",
    classification: "account",
    coordinates: { lat: 47.3769, lon: 8.5417 }, // Zurich
    threatLevel: "critical",
    status: "flagged",
    caseReference: "ML-2026-CH04",
    details: "Suspicious numbered escrow accounts linked to offshore trade misinvoicing.",
    confidenceScore: 0.98,
  },
  {
    id: "node-3",
    label: "C2 Host Cluster-V",
    classification: "device",
    coordinates: { lat: 50.1109, lon: 8.6821 }, // Frankfurt
    threatLevel: "high",
    status: "intercepted",
    caseReference: "CY-2026-DE88",
    details: "Encrypted bulletproof reverse-proxy cluster routing coordinated ransomware ransom flows.",
    confidenceScore: 0.91,
  },
  {
    id: "node-4",
    label: "Transit Terminal Alpha",
    classification: "location",
    coordinates: { lat: 51.9244, lon: 4.4777 }, // Rotterdam
    threatLevel: "high",
    status: "surveilled",
    caseReference: "LOG-2026-NL12",
    details: "Containerized logistics transshipment point flagged for container seal tampering.",
    confidenceScore: 0.89,
  },
  {
    id: "node-5",
    label: "Syndicate Cell-07",
    classification: "organization",
    coordinates: { lat: 44.4268, lon: 26.1025 }, // Bucharest
    threatLevel: "critical",
    status: "active",
    caseReference: "CY-2026-RO31",
    details: "Underground credential harvester ring targeting enterprise SWIFT access tokens.",
    confidenceScore: 0.96,
  },
  {
    id: "node-6",
    label: "Broker Nexus 88",
    classification: "account",
    coordinates: { lat: 25.2048, lon: 55.2708 }, // Dubai
    threatLevel: "high",
    status: "active",
    caseReference: "FIN-2026-AE09",
    details: "Over-the-counter crypto-to-cash laundering clearinghouse with mixer obfuscation.",
    confidenceScore: 0.93,
  },
  {
    id: "node-7",
    label: "Target Phoenix-01",
    classification: "person",
    coordinates: { lat: 19.076, lon: 72.8777 }, // Mumbai
    threatLevel: "critical",
    status: "flagged",
    caseReference: "FIR-2026-IN02",
    details: "Identified financial controller managing multi-tier mule accounts and VoIP spoof relays.",
    confidenceScore: 0.97,
  },
  {
    id: "node-8",
    label: "Trade Shell Entity 11",
    classification: "organization",
    coordinates: { lat: 1.3521, lon: 103.8198 }, // Singapore
    threatLevel: "moderate",
    status: "surveilled",
    caseReference: "CMP-2026-SG15",
    details: "Front company holding commercial export licenses used to mask shadow commodity transfers.",
    confidenceScore: 0.85,
  },
  {
    id: "node-9",
    label: "Darknet Relay 04",
    classification: "device",
    coordinates: { lat: 35.6762, lon: 139.6503 }, // Tokyo
    threatLevel: "high",
    status: "intercepted",
    caseReference: "CY-2026-JP77",
    details: "Secondary hop tunnel used to exfiltrate session keys and cryptographic seeds.",
    confidenceScore: 0.9,
  },
  {
    id: "node-10",
    label: "Maritime Corridor Gate",
    classification: "location",
    coordinates: { lat: 35.7595, lon: -5.834 }, // Tangier
    threatLevel: "high",
    status: "surveilled",
    caseReference: "INT-2026-MA03",
    details: "Straits transit bottleneck monitored for high-speed coastal contraband drop-offs.",
    confidenceScore: 0.88,
  },
  {
    id: "node-11",
    label: "Corporate Veil Escrow",
    classification: "organization",
    coordinates: { lat: 8.9824, lon: -79.5199 }, // Panama
    threatLevel: "critical",
    status: "flagged",
    caseReference: "LAW-2026-PA22",
    details: "Law firm nominee directors concealing ultimate beneficial ownership of shell fleets.",
    confidenceScore: 0.95,
  },
  {
    id: "node-12",
    label: "Syndicate Logistics Wing",
    classification: "person",
    coordinates: { lat: 25.7617, lon: -80.1918 }, // Miami
    threatLevel: "high",
    status: "active",
    caseReference: "DEA-2026-FL08",
    details: "Air cargo charter coordinator linked to bulk cash and illicit cargo flights.",
    confidenceScore: 0.92,
  },
  {
    id: "node-13",
    label: "South Pacific Endpoint",
    classification: "account",
    coordinates: { lat: -33.8688, lon: 151.2093 }, // Sydney
    threatLevel: "moderate",
    status: "surveilled",
    caseReference: "AU-2026-SY44",
    details: "Cold-storage crypto wallet receiving consolidated proceeds from Asian syndicate ops.",
    confidenceScore: 0.86,
  },
  {
    id: "node-14",
    label: "Syndicate Operative K-9",
    classification: "person",
    coordinates: { lat: 6.2442, lon: -75.5812 }, // Medellín
    threatLevel: "critical",
    status: "active",
    caseReference: "ORG-2026-CO19",
    details: "Primary regional kingpin coordinating cross-border logistical cartels.",
    confidenceScore: 0.96,
  },
  {
    id: "node-15",
    label: "BEC Dispatch Node",
    classification: "device",
    coordinates: { lat: 6.5244, lon: 3.3792 }, // Lagos
    threatLevel: "high",
    status: "flagged",
    caseReference: "FRAUD-2026-NG05",
    details: "Automated spear-phishing mail infrastructure targeting treasury executives.",
    confidenceScore: 0.89,
  },
  {
    id: "node-16",
    label: "Pacific Transit Hub",
    classification: "location",
    coordinates: { lat: 22.3193, lon: 114.1694 }, // Hong Kong
    threatLevel: "high",
    status: "active",
    caseReference: "HK-2026-HK81",
    details: "Trade-based money laundering invoice matching node under joint regulatory watch.",
    confidenceScore: 0.91,
  },
];

export const INITIAL_NETWORK_CONNECTIONS: NetworkConnection[] = [
  // Western Hemisphere Syndicate Route: Medellín -> Panama -> Miami -> New York
  {
    id: "conn-1",
    sourceId: "node-14", // Medellín
    targetId: "node-11", // Panama
    type: "illicit_transit",
    strength: 0.9,
    activeTransmission: true,
    flowSpeed: 1.2,
  },
  {
    id: "conn-2",
    sourceId: "node-11", // Panama
    targetId: "node-12", // Miami
    type: "financial_conduit",
    strength: 0.85,
    activeTransmission: true,
    flowSpeed: 1.0,
  },
  {
    id: "conn-3",
    sourceId: "node-12", // Miami
    targetId: "node-1", // New York
    type: "financial_conduit",
    strength: 0.78,
    activeTransmission: true,
    flowSpeed: 1.4,
  },

  // Transatlantic Cyber / Financial Conduit: New York <-> Zurich <-> Frankfurt
  {
    id: "conn-4",
    sourceId: "node-1", // New York
    targetId: "node-2", // Zurich
    type: "financial_conduit",
    strength: 0.95,
    activeTransmission: true,
    flowSpeed: 1.6,
  },
  {
    id: "conn-5",
    sourceId: "node-2", // Zurich
    targetId: "node-3", // Frankfurt
    type: "encrypted_relay",
    strength: 0.82,
    activeTransmission: true,
    flowSpeed: 0.9,
  },

  // European Maritime / Cyber Vector: Bucharest -> Frankfurt -> Rotterdam -> Tangier
  {
    id: "conn-6",
    sourceId: "node-5", // Bucharest
    targetId: "node-3", // Frankfurt
    type: "c2_command",
    strength: 0.92,
    activeTransmission: true,
    flowSpeed: 1.3,
  },
  {
    id: "conn-7",
    sourceId: "node-3", // Frankfurt
    targetId: "node-4", // Rotterdam
    type: "c2_command",
    strength: 0.88,
    activeTransmission: true,
    flowSpeed: 1.1,
  },
  {
    id: "conn-8",
    sourceId: "node-4", // Rotterdam
    targetId: "node-10", // Tangier
    type: "illicit_transit",
    strength: 0.86,
    activeTransmission: true,
    flowSpeed: 0.8,
  },

  // Africa to Middle East Financial Flow: Lagos -> Dubai -> Zurich
  {
    id: "conn-9",
    sourceId: "node-15", // Lagos
    targetId: "node-6", // Dubai
    type: "financial_conduit",
    strength: 0.84,
    activeTransmission: true,
    flowSpeed: 1.2,
  },
  {
    id: "conn-10",
    sourceId: "node-6", // Dubai
    targetId: "node-2", // Zurich
    type: "financial_conduit",
    strength: 0.91,
    activeTransmission: true,
    flowSpeed: 1.5,
  },

  // South Asia - Middle East - SE Asia Nexus: Mumbai -> Dubai & Mumbai -> Singapore
  {
    id: "conn-11",
    sourceId: "node-7", // Mumbai
    targetId: "node-6", // Dubai
    type: "financial_conduit",
    strength: 0.89,
    activeTransmission: true,
    flowSpeed: 1.3,
  },
  {
    id: "conn-12",
    sourceId: "node-7", // Mumbai
    targetId: "node-8", // Singapore
    type: "syndicate_link",
    strength: 0.81,
    activeTransmission: true,
    flowSpeed: 1.0,
  },

  // Asia-Pacific Triad Route: Singapore -> Hong Kong -> Tokyo -> Sydney
  {
    id: "conn-13",
    sourceId: "node-8", // Singapore
    targetId: "node-16", // Hong Kong
    type: "financial_conduit",
    strength: 0.88,
    activeTransmission: true,
    flowSpeed: 1.1,
  },
  {
    id: "conn-14",
    sourceId: "node-16", // Hong Kong
    targetId: "node-9", // Tokyo
    type: "encrypted_relay",
    strength: 0.83,
    activeTransmission: true,
    flowSpeed: 1.4,
  },
  {
    id: "conn-15",
    sourceId: "node-16", // Hong Kong
    targetId: "node-13", // Sydney
    type: "financial_conduit",
    strength: 0.76,
    activeTransmission: true,
    flowSpeed: 0.9,
  },
];

export const DEMO_GLOBE_DATA: NetworkGlobeData = {
  nodes: INITIAL_INTELLIGENCE_NODES,
  connections: INITIAL_NETWORK_CONNECTIONS,
  lastUpdated: "2026-09-18T10:30:00Z",
  systemPosture: "Active Ingestion / Threat Correlated",
};
