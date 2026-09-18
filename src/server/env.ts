import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  AUTH_SECRET: z.string().min(32),
  EVIDENCE_STORAGE_ROOT: z.string().min(1),
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
