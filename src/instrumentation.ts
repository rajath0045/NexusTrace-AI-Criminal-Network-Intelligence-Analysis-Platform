import { assertProductionEnvironment } from "@/server/env";
import { operationalLog } from "@/server/observability/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const environment = assertProductionEnvironment();
    operationalLog.info("application.startup", { nodeEnv: process.env.NODE_ENV, appOrigin: environment.APP_ORIGIN ?? "development" });
    if (environment.NEO4J_URI) {
      const { processGraphProjectionOutbox } = await import("@/server/services/graph-projection-service");
      void processGraphProjectionOutbox().then((summary) => operationalLog.info("graph.projection_startup_drain", summary));
    }
  } catch (error) {
    operationalLog.error("application.configuration_invalid", { message: error instanceof Error ? error.message : "Unknown configuration error" });
    throw error;
  }
}
