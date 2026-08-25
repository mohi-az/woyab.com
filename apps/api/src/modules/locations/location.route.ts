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

/**
 * @openapi
 * /countries:
 *   get:
 *     summary: List countries
 *     tags: [Locations]
 *     responses:
 *       200: { description: Country list }
 */
countryRouter.get("/", countryController.list);
/**
 * @openapi
 * /countries/{id}:
 *   get:
 *     summary: Get a country
 *     tags: [Locations]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Country }
 *       404: { description: Country not found }
 */
countryRouter.get("/:id", countryController.getById);

/**
 * @openapi
 * /provinces:
 *   get:
 *     summary: List provinces
 *     tags: [Locations]
 *     parameters:
 *       - { in: query, name: countryId, schema: { type: integer } }
 *       - { in: query, name: locale, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: Province list }
 */
provinceRouter.get("/", provinceController.list);
/**
 * @openapi
 * /provinces/{id}:
 *   get:
 *     summary: Get a province
 *     tags: [Locations]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Province }
 *       404: { description: Province not found }
 */
provinceRouter.get("/:id", provinceController.getById);

/**
 * @openapi
 * /cities:
 *   get:
 *     summary: List cities
 *     tags: [Locations]
 *     parameters:
 *       - { in: query, name: provinceId, schema: { type: integer } }
 *       - { in: query, name: locale, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: City list }
 */
cityRouter.get("/", cityController.list);
/**
 * @openapi
 * /cities/{id}:
 *   get:
 *     summary: Get a city
 *     tags: [Locations]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: City }
 *       404: { description: City not found }
 */
cityRouter.get("/:id", cityController.getById);

/**
 * @openapi
 * /districts:
 *   get:
 *     summary: List districts
 *     tags: [Locations]
 *     parameters:
 *       - { in: query, name: cityId, schema: { type: integer } }
 *       - { in: query, name: locale, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: District list }
 */
districtRouter.get("/", districtController.list);
/**
 * @openapi
 * /districts/{id}:
 *   get:
 *     summary: Get a district
 *     tags: [Locations]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: District }
 *       404: { description: District not found }
 */
districtRouter.get("/:id", districtController.getById);
