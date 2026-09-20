import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  EVIDENCE_STORAGE_ROOT: z.string().min(1),
  APP_ORIGIN: z.string().url().optional(),
  NEO4J_URI: z.string().url().optional(),
  NEO4J_USERNAME: z.string().min(1).optional(),
  NEO4J_PASSWORD: z.string().min(1).optional(),
  NEO4J_DATABASE: z.string().min(1).optional(),
}).superRefine((value, context) => {
  const configured = [value.NEO4J_URI, value.NEO4J_USERNAME, value.NEO4J_PASSWORD, value.NEO4J_DATABASE]
    .filter(Boolean).length;
  if (configured > 0 && configured < 4) {
    context.addIssue({ code: "custom", message: "All NEO4J_* variables are required when Neo4j is configured." });
  }
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  if (environment === process.env && cachedEnvironment) {
    return cachedEnvironment;
  }

  const parsed = serverEnvironmentSchema.parse(environment);

  if (environment === process.env) {
    cachedEnvironment = parsed;
  }

  return parsed;
}

export function assertProductionEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const parsed = getServerEnvironment(environment);
  if (environment.NODE_ENV !== "production") return parsed;

  if (!parsed.APP_ORIGIN) {
    throw new Error("APP_ORIGIN is required when NODE_ENV=production.");
  }

  const origin = new URL(parsed.APP_ORIGIN);
  const isLocal = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (origin.protocol !== "https:" && !isLocal) {
    throw new Error("APP_ORIGIN must use HTTPS outside local production smoke tests.");
  }

  return parsed;
}

export function getNeo4jEnvironment(environment: NodeJS.ProcessEnv = process.env): {
  uri: string; username: string; password: string; database: string;
} | null {
  const parsed = getServerEnvironment(environment);
  if (!parsed.NEO4J_URI) return null;
  return {
    uri: parsed.NEO4J_URI,
    username: parsed.NEO4J_USERNAME!,
    password: parsed.NEO4J_PASSWORD!,
    database: parsed.NEO4J_DATABASE!,
  };
}
