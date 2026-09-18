import { UserRole } from "@/domain/model";

export interface AccessLevel {
  role: UserRole;
  title: string;
  heading: string;
  badge: string;
}

export const accessLevels: readonly AccessLevel[] = [
  {
    role: UserRole.Administrator,
    title: "Administrator",
    heading: "Administrator sign in",
    badge: "Administrator access",
  },
  {
    role: UserRole.DepartmentUser,
    title: "Department",
    heading: "Department sign in",
    badge: "Department access",
  },
  {
    role: UserRole.Investigator,
    title: "Investigator",
    heading: "Investigator sign in",
    badge: "Investigator access",
  },
];

export function accessLevelForRole(role: UserRole): AccessLevel {
  const match = accessLevels.find((level) => level.role === role);

  if (!match) {
    throw new Error("Unknown NexusTrace access level.");
  }

  return match;
}
