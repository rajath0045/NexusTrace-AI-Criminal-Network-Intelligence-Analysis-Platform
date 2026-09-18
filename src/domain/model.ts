export enum UserRole {
  Administrator = "ADMINISTRATOR",
  DepartmentUser = "DEPARTMENT_USER",
  Investigator = "INVESTIGATOR",
}

export enum CaseParticipation {
  Suspect = "SUSPECT",
  Victim = "VICTIM",
  Witness = "WITNESS",
  Complainant = "COMPLAINANT",
  Investigator = "INVESTIGATOR",
}

export enum CaseStatus {
  Open = "OPEN",
  Active = "ACTIVE",
  Suspended = "SUSPENDED",
  Closed = "CLOSED",
  Archived = "ARCHIVED",
}

export enum GraphEntityType {
  Person = "PERSON",
  Vehicle = "VEHICLE",
  Property = "PROPERTY",
  Phone = "PHONE",
  Device = "DEVICE",
  BankAccount = "BANK_ACCOUNT",
  Organization = "ORGANIZATION",
  Location = "LOCATION",
  Case = "CASE",
  Incident = "INCIDENT",
}

export enum RelationshipStrength {
  Primary = "PRIMARY",
  Secondary = "SECONDARY",
  Tertiary = "TERTIARY",
}

export enum EvidenceConfidence {
  Verified = "VERIFIED",
  Probable = "PROBABLE",
  Unverified = "UNVERIFIED",
}

export enum VerificationState {
  Pending = "PENDING",
  Verified = "VERIFIED",
  Rejected = "REJECTED",
  ChangesRequested = "CHANGES_REQUESTED",
}
