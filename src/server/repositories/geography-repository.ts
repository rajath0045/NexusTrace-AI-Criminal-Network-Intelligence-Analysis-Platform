import type { Actor } from "@/domain/auth";
import type {
  GeographicActivityRecord,
  GeographicFindingSummary,
  LocationObservationInput,
  LocationObservationView,
} from "@/domain/geography";
import type { LocationObservationType } from "@/domain/model";

export interface GeographicObservationQuery {
  entityIds: string[];
  observationTypes?: LocationObservationType[];
  startTime?: Date;
  endTime?: Date;
}

export interface GeographicActivityQuery {
  entityIds: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface GeographyRepository {
  createObservation(actor: Actor, input: LocationObservationInput): Promise<LocationObservationView>;
  listObservations(actor: Actor, query: GeographicObservationQuery): Promise<LocationObservationView[]>;
  findNearestTemporalObservation(actor: Actor, entityId: string, eventAt: Date, allowedWindowMinutes: number): Promise<LocationObservationView | null>;
  listActivities(actor: Actor, query: GeographicActivityQuery): Promise<GeographicActivityRecord[]>;
  listFindings(actor: Actor, personId: string | null): Promise<GeographicFindingSummary[]>;
}
