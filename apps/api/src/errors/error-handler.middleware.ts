import type { ErrorRequestHandler } from "express";
import type { ApiErrorResponse } from "@fargo/shared";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { logger } from "../logger/logger.js";
import { ApiError } from "./api-error.js";

const toValidationDetails = (error: ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

export const errorHandlerMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const apiError =
    error instanceof ApiError
      ? error
      : error instanceof ZodError
        ? ApiError.validation(toValidationDetails(error))
        : new ApiError("Internal server error", {
            code: "INTERNAL_SERVER_ERROR",
            expose: false,
            statusCode: 500,
          });

  if (apiError.statusCode >= 500) {
    logger.error({ error, requestId: req.id }, apiError.message);
  }

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.expose || env.NODE_ENV !== "production" ? apiError.message : "Internal server error",
      requestId: String(req.id),
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  };

  res.status(apiError.statusCode).json(response);
};
