import type { ApiErrorCode, ApiErrorDetail } from "@woyab/shared";

type ApiErrorOptions = {
  code: ApiErrorCode;
  details?: ApiErrorDetail[];
  expose?: boolean;
  statusCode: number;
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];
  readonly expose: boolean;
  readonly statusCode: number;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);

    this.name = "ApiError";
    this.code = options.code;
    this.details = options.details;
    this.expose = options.expose ?? options.statusCode < 500;
    this.statusCode = options.statusCode;
  }

  static badRequest(message = "Bad request", details?: ApiErrorDetail[]) {
    return new ApiError(message, {
      code: "BAD_REQUEST",
      details,
      statusCode: 400,
    });
  }

  static notFound(message = "Resource not found") {
    return new ApiError(message, {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  static validation(details: ApiErrorDetail[]) {
    return new ApiError("Request validation failed", {
      code: "VALIDATION_ERROR",
      details,
      statusCode: 422,
    });
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(message, {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(message, {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  static serviceUnavailable(message = "Service unavailable") {
    return new ApiError(message, {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }
}
