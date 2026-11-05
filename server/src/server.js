import { app } from "./app.js";
import { config } from "./config.js";
import { initializeDatabase, closeDatabase } from "./store/postgres.js";
import { logger } from "./utils/logger.js";

async function start() {
  await initializeDatabase();
  const server = app.listen(config.port, () => {
    logger.info(`Book RAG Assistant API listening on port ${config.port}`);
    logger.info(`PostgreSQL database configured at ${config.postgresUrl.replace(/:\/\/.*@/, "://***@")}`);
  });

  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down.`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  logger.error("Unable to start server:", err);
  process.exitCode = 1;
});
