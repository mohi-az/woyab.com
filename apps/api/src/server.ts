import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./logger/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `${env.APP_NAME} is running`);
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down API");

  server.close((error) => {
    if (error) {
      logger.error({ error }, "Failed to shut down cleanly");
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
