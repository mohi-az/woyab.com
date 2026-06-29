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
import { businessRouter } from "./modules/businesses/business.route.js";
import { categoryRouter, specialtyRouter, subCategoryRouter } from "./modules/categories/category.route.js";
import { cityRouter, countryRouter, districtRouter, provinceRouter } from "./modules/locations/location.route.js";
import { reviewRouter, reviewStandaloneRouter } from "./modules/reviews/review.route.js";
import { serviceRouter } from "./modules/services/service.route.js";
import { tagRouter } from "./modules/tags/tag.route.js";
import { userRouter } from "./modules/users/user.route.js";
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

  const v = `/${env.API_VERSION}`;

  app.use(v, healthRouter);
  app.use(`${v}/users`, userRouter);
  app.use(`${v}/categories`, categoryRouter);
  app.use(`${v}/sub-categories`, subCategoryRouter);
  app.use(`${v}/specialties`, specialtyRouter);
  app.use(`${v}/businesses`, businessRouter);
  app.use(`${v}/businesses/:businessId/services`, serviceRouter);
  app.use(`${v}/businesses/:businessId/reviews`, reviewRouter);
  app.use(`${v}/reviews`, reviewStandaloneRouter);
  app.use(`${v}/tags`, tagRouter);
  app.use(`${v}/countries`, countryRouter);
  app.use(`${v}/provinces`, provinceRouter);
  app.use(`${v}/cities`, cityRouter);
  app.use(`${v}/districts`, districtRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
};
