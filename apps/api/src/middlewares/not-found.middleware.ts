import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../errors/api-error.js";

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} was not found`));
};
