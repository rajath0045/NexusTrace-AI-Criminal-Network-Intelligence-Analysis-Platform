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

export enum IncidentType {
  Crime = "CRIME",
  SuspiciousEvent = "SUSPICIOUS_EVENT",
  Meeting = "MEETING",
  Accident = "ACCIDENT",
  Transaction = "TRANSACTION",
  Communication = "COMMUNICATION",
  Movement = "MOVEMENT",
  Other = "OTHER",
}

export enum IncidentStatus {
  Open = "OPEN",
  Active = "ACTIVE",
  Resolved = "RESOLVED",
  Archived = "ARCHIVED",
}

export enum IncidentSubmissionStatus {
  Draft = "DRAFT",
  PendingReview = "PENDING_REVIEW",
  ChangesRequested = "CHANGES_REQUESTED",
  Rejected = "REJECTED",
  Accepted = "ACCEPTED",
}

export enum IncidentVerificationLevel {
  Unverified = "UNVERIFIED",
  DepartmentVerified = "DEPARTMENT_VERIFIED",
  CrossVerified = "CROSS_VERIFIED",
}

export enum IncidentParticipation {
  Suspect = "SUSPECT",
  Accused = "ACCUSED",
  Victim = "VICTIM",
  Witness = "WITNESS",
  Complainant = "COMPLAINANT",
  Investigator = "INVESTIGATOR",
  Other = "OTHER",
}

export enum CommunicationType {
  Call = "CALL",
  Message = "MESSAGE",
  Email = "EMAIL",
  DigitalContact = "DIGITAL_CONTACT",
  Other = "OTHER",
}

export enum CommunicationDirection {
  Inbound = "INBOUND",
  Outbound = "OUTBOUND",
  Bidirectional = "BIDIRECTIONAL",
  Unknown = "UNKNOWN",
}

export enum FinancialTransactionType {
  Transfer = "TRANSFER",
  CashDeposit = "CASH_DEPOSIT",
  CashWithdrawal = "CASH_WITHDRAWAL",
  Payment = "PAYMENT",
  Other = "OTHER",
}
