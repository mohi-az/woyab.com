import { Router } from "express";

import { categoryController, specialtyController, subCategoryController } from "./category.controller.js";

/**
 * Taxonomy mutations intentionally live behind the authenticated Next.js admin
 * actions. The public Express surface is read-only.
 */
export const categoryRouter = Router();
export const subCategoryRouter = Router();
export const specialtyRouter = Router();

categoryRouter.get("/", categoryController.list);
categoryRouter.get("/:id", categoryController.getById);

subCategoryRouter.get("/", subCategoryController.list);
subCategoryRouter.get("/:id", subCategoryController.getById);

specialtyRouter.get("/", specialtyController.list);
specialtyRouter.get("/:id", specialtyController.getById);
