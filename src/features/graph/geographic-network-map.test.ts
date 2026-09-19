import { Building2, Car, House, TriangleAlert } from "lucide-react";
import { describe, expect, it } from "vitest";
import { GraphEntityType, IncidentVerificationLevel, LocationObservationType, LocationSourceRecordType, RelationshipStrength } from "@/domain/model";
import type { SerializedGeographicConnection, SerializedLocationObservation } from "./geographic-view-model";
import { buildConnectionGeoJson, buildObservationGeoJson, observationClustering, observationIcon, selectImportantMarkers, tierColors, verificationStyles } from "./geographic-network-map";

function observation(id: string, entityType = GraphEntityType.Person, observationType = LocationObservationType.ObservedPersonLocation): SerializedLocationObservation {
  return { id, graphEntityId: `entity-${id}`, entityType, entityLabel: id, latitude: 12.9, longitude: 77.6, observedAt: "2026-09-18T20:45:00.000Z", observationType, locationLabel: `Location ${id}`, context: null, accuracyMeters: null, sourceRecordType: LocationSourceRecordType.Evidence, sourceRecordId: "source", sourceEvidenceId: null, verificationLevel: IncidentVerificationLevel.DepartmentVerified };
}

function connection(sourceObservation: SerializedLocationObservation | null, targetObservation: SerializedLocationObservation | null): SerializedGeographicConnection {
  return { id: "a:b", sourceEntityId: "a", targetEntityId: "b", sourceLabel: "A", targetLabel: "B", sourceObservation, targetObservation, strength: RelationshipStrength.Primary, verification: IncidentVerificationLevel.DepartmentVerified, relationshipIds: [], counts: { calls: 12, messages: 6, emails: 0, digitalContacts: 0, financial: 2, relationships: 1 }, records: [] };
}

describe("geographic network map model", () => {
  it("projects authorized observations into cluster-ready GeoJSON", () => {
    const result = buildObservationGeoJson([observation("home", GraphEntityType.Location, LocationObservationType.Residence)]);
    expect(result.features[0]).toMatchObject({ geometry: { coordinates: [77.6, 12.9] }, properties: { observationType: LocationObservationType.Residence } });
    expect(observationClustering).toEqual({ cluster: true, clusterMaxZoom: 13, clusterRadius: 48 });
  });

  it("uses the approved tier palette and separate verification semantics", () => {
    expect(tierColors).toEqual({ PRIMARY: "#ff365e", SECONDARY: "#2f9bff", TERTIARY: "#f5db45" });
    expect(verificationStyles.CROSS_VERIFIED).toMatchObject({ dashed: false, glow: true });
    expect(verificationStyles.UNVERIFIED).toMatchObject({ dashed: true, glow: false });
  });

  it("uses semantic residence, property, vehicle-observation, and incident icons", () => {
    expect(observationIcon(observation("home", GraphEntityType.Location, LocationObservationType.Residence))).toBe(House);
    expect(observationIcon(observation("property", GraphEntityType.Property, LocationObservationType.Property))).toBe(Building2);
    expect(observationIcon(observation("vehicle", GraphEntityType.Vehicle, LocationObservationType.VehicleObservation))).toBe(Car);
    expect(observationIcon(observation("incident", GraphEntityType.Incident, LocationObservationType.IncidentLocation))).toBe(TriangleAlert);
  });

  it("bundles a multi-record connection into one curved line", () => {
    const source = observation("a");
    const target = { ...observation("b"), latitude: 13, longitude: 77.7 };
    const result = buildConnectionGeoJson([connection(source, target)]);
    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.geometry.coordinates).toHaveLength(3);
    expect(result.features[0]?.properties).toMatchObject({ calls: 12, messages: 6, financial: 2 });
  });

  it("never manufactures a line when either endpoint location is unknown", () => {
    expect(buildConnectionGeoJson([connection(observation("a"), null)]).features).toEqual([]);
    expect(buildConnectionGeoJson([connection(null, null)]).features).toEqual([]);
  });

  it("bounds DOM markers while preserving focus and important observations", () => {
    const observations = Array.from({ length: 50 }, (_, index) => observation(String(index), index === 40 ? GraphEntityType.Vehicle : GraphEntityType.Person, index === 40 ? LocationObservationType.VehicleObservation : LocationObservationType.ObservedPersonLocation));
    const selected = selectImportantMarkers(observations, "entity-49", "entity-48");
    expect(selected).toHaveLength(36);
    expect(selected.map((item) => item.graphEntityId)).toEqual(expect.arrayContaining(["entity-49", "entity-48", "entity-40"]));
  });
});
