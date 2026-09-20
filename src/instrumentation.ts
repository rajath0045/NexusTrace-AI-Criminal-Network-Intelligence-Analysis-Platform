import { assertProductionEnvironment } from "@/server/env";
import { operationalLog } from "@/server/observability/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const environment = assertProductionEnvironment();
    operationalLog.info("application.startup", { nodeEnv: process.env.NODE_ENV, appOrigin: environment.APP_ORIGIN ?? "development" });
  } catch (error) {
    operationalLog.error("application.configuration_invalid", { message: error instanceof Error ? error.message : "Unknown configuration error" });
    throw error;
  }
}
