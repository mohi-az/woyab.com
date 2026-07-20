import { Router } from "express";

import { cityController, countryController, districtController, provinceController } from "./location.controller.js";

/**
 * Location mutations intentionally live behind the authenticated Next.js admin
 * actions. The public Express surface is read-only.
 */
export const countryRouter = Router();
export const provinceRouter = Router();
export const cityRouter = Router();
export const districtRouter = Router();

countryRouter.get("/", countryController.list);
countryRouter.get("/:id", countryController.getById);

provinceRouter.get("/", provinceController.list);
provinceRouter.get("/:id", provinceController.getById);

cityRouter.get("/", cityController.list);
cityRouter.get("/:id", cityController.getById);

districtRouter.get("/", districtController.list);
districtRouter.get("/:id", districtController.getById);
