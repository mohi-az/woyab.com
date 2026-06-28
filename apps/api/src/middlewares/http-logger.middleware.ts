import type { Request, Response } from "express";
import { pinoHttp } from "pino-http";

import { logger } from "../logger/logger.js";

export const httpLoggerMiddleware = pinoHttp({
  logger,
  genReqId: (req: Request) => req.id,
  customProps: (req: Request, _res: Response) => ({
    requestId: req.id,
  }),
});
