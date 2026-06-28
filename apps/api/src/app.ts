import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { corsOrigins, env } from "./config/env.js";
import { openApiSpec } from "./config/swagger.js";
import { errorHandlerMiddleware } from "./errors/error-handler.middleware.js";
import { httpLoggerMiddleware } from "./middlewares/http-logger.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import { healthRouter } from "./routes/health.route.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(httpLoggerMiddleware);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/docs.json", (_req, res) => res.json(openApiSpec));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(`/${env.API_VERSION}`, healthRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
};
