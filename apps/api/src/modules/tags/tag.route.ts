import { Router } from "express";

import { tagController } from "./tag.controller.js";

/**
 * Tag mutations intentionally live behind the authenticated Next.js admin
 * actions. The public Express surface is read-only.
 */
export const tagRouter = Router();

tagRouter.get("/", tagController.list);
tagRouter.get("/:id", tagController.getById);
