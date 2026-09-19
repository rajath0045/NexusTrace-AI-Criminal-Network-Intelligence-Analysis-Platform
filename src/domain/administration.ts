import { z } from "zod";
import { UserRole } from "./model";

export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(UserRole).optional(),
  departmentId: z.string().uuid().optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const userUpdateSchema = z.object({
  role: z.enum(UserRole).optional(),
  departmentId: z.string().uuid().optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Choose at least one user attribute to update." });

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;

export interface DepartmentOption { id: string; code: string; name: string; }

export interface AdminUserView {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  department: DepartmentOption;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserPage { items: AdminUserView[]; nextCursor: string | null; }

export interface DepartmentAdministrationView extends DepartmentOption {
  memberCount: number;
  activeMemberCount: number;
  caseCount: number;
  incidentCount: number;
  findingCount: number;
}

export interface GovernanceSummary {
  departmentVerifiedIncidents: number;
  crossVerifiedIncidents: number;
  openIncidentReviews: number;
  escalatedFindings: number;
}
