import { describe, expect, it } from "vitest";
import { UserRole } from "@/domain/model";
import {
  assertCan,
  can,
  canAccessDepartment,
  type Actor,
} from "./policy";

const investigatorActor: Actor = {
  userId: "investigator-1",
  email: "investigator@nexustrace.demo",
  displayName: "Ishaan Sen",
  role: UserRole.Investigator,
  departmentId: "financial-intelligence",
};

const departmentActor: Actor = {
  ...investigatorActor,
  userId: "department-user-1",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "cyber-crime",
};

const administratorActor: Actor = {
  ...investigatorActor,
  userId: "administrator-1",
  email: "admin@nexustrace.demo",
  displayName: "Aditi Rao",
  role: UserRole.Administrator,
  departmentId: "headquarters",
};

describe("authorization policy", () => {
  it("prevents investigators from creating verified relationships", () => {
    expect(can(investigatorActor, "RELATIONSHIP_VERIFY")).toBe(false);
    expect(() => assertCan(investigatorActor, "RELATIONSHIP_VERIFY")).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("allows department users to create cases only for their department", () => {
    expect(can(departmentActor, "CASE_CREATE")).toBe(true);
    expect(can(departmentActor, "PERSON_ASSOCIATE")).toBe(true);
    expect(can(investigatorActor, "PERSON_ASSOCIATE")).toBe(false);
    expect(canAccessDepartment(departmentActor, departmentActor.departmentId)).toBe(true);
    expect(canAccessDepartment(departmentActor, "another-department")).toBe(false);
  });

  it("allows administrators to verify relationships across departments", () => {
    expect(can(administratorActor, "RELATIONSHIP_VERIFY")).toBe(true);
    expect(canAccessDepartment(administratorActor, "another-department")).toBe(true);
  });
});
