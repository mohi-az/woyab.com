import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.header("x-request-id") ?? crypto.randomUUID();

  req.id = requestId;
  res.setHeader("x-request-id", requestId);

  next();
};
