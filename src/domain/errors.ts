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

export class ValidationError extends Error {
  readonly code = "VALIDATION";

  constructor(message = "The supplied data is invalid.") {
    super(message);
    this.name = "ValidationError";
  }
}

export class StorageError extends Error {
  readonly code = "STORAGE";

  constructor(message = "The evidence file could not be accessed.") {
    super(message);
    this.name = "StorageError";
  }
}

export class RateLimitError extends Error {
  readonly code = "RATE_LIMITED";

  constructor(message = "Too many requests. Try again shortly.") {
    super(message);
  }
}
