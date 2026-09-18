export class NotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor(message = "The requested record was not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  readonly code = "CONFLICT";

  constructor(message = "A record with that identifier already exists.") {
    super(message);
    this.name = "ConflictError";
  }
}
