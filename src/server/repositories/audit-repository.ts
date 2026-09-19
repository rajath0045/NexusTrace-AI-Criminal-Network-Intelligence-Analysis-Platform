import type { Actor } from "@/domain/auth";
import type { AuditEventPage, AuditQuery } from "@/domain/audit";

export interface AuditRepository {
  list(actor: Actor, query: AuditQuery): Promise<AuditEventPage>;
  options(): Promise<{ actors: Array<{ id: string; displayName: string }>; departments: Array<{ id: string; name: string; code: string }>; actions: string[]; targetTypes: string[] }>;
}
