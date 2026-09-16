import { app } from "./app.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

app.listen(config.port, () => {
  logger.info(`Book RAG Assistant API listening on port ${config.port}`);
  logger.info(`RAG service URL: ${config.ragServiceUrl}`);
});
