import { spawn } from "node:child_process";

function configurationError(message) {
  process.stderr.write(`NexusTrace production configuration error: ${message}\n`);
  process.exit(1);
}

for (const key of ["DATABASE_URL", "EVIDENCE_STORAGE_ROOT", "APP_ORIGIN"]) {
  if (!process.env[key]) {
    configurationError(`${key} is required when starting the production server.`);
  }
}

let appOrigin;
try {
  appOrigin = new URL(process.env.APP_ORIGIN);
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (databaseUrl.protocol !== "postgresql:") {
    configurationError("DATABASE_URL must use the postgresql:// protocol.");
  }
} catch {
  configurationError("DATABASE_URL and APP_ORIGIN must be valid URLs.");
}

const localOrigin = appOrigin.hostname === "localhost" || appOrigin.hostname === "127.0.0.1";
if (appOrigin.protocol !== "https:" && !localOrigin) {
  configurationError("APP_ORIGIN must use HTTPS outside local production smoke tests.");
}

const server = spawn(process.execPath, [".next/standalone/server.js"], {
  env: process.env,
  stdio: "inherit",
});

server.on("error", (error) => {
  process.stderr.write(`NexusTrace production server failed to start: ${error.message}\n`);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
