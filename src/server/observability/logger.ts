type LogLevel = "info" | "warn" | "error";

const sensitive = /password|token|secret|cookie|authorization|storagekey|checksum|evidencecontent|database_url/i;
const sensitiveValue = /postgres(?:ql)?:\/\/|password=|token=|secret=/i;

function sanitize(value: unknown): unknown {
  if (typeof value === "string" && sensitiveValue.test(value)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sensitive.test(key) ? "[REDACTED]" : sanitize(entry)]));
}

function write(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...(sanitize(context) as Record<string, unknown>) });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const operationalLog = {
  info: (event: string, context?: Record<string, unknown>) => write("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => write("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => write("error", event, context),
};
