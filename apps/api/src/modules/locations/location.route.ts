import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { cityController, countryController, districtController, provinceController } from "./location.controller.js";
import {
  createCityBodySchema,
  createCountryBodySchema,
  createDistrictBodySchema,
  createProvinceBodySchema,
  updateCityBodySchema,
  updateCountryBodySchema,
  updateDistrictBodySchema,
  updateProvinceBodySchema,
} from "./location.schema.js";

export const countryRouter = Router();
export const provinceRouter = Router();
export const cityRouter = Router();
export const districtRouter = Router();

// ─── Country Routes ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /countries:
 *   get:
 *     summary: List all countries
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: List of countries
 */
countryRouter.get("/", countryController.list);

/**
 * @openapi
 * /countries/{id}:
 *   get:
 *     summary: Get a country by ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Country with provinces
 *       404:
 *         description: Country not found
 */
countryRouter.get("/:id", countryController.getById);
countryRouter.post("/", validateRequest({ body: createCountryBodySchema }), countryController.create);
countryRouter.patch("/:id", validateRequest({ body: updateCountryBodySchema }), countryController.update);
countryRouter.delete("/:id", countryController.delete);

// ─── Province Routes ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /provinces:
 *   get:
 *     summary: List provinces
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: countryId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated list of provinces
 */
provinceRouter.get("/", provinceController.list);
provinceRouter.get("/:id", provinceController.getById);
provinceRouter.post("/", validateRequest({ body: createProvinceBodySchema }), provinceController.create);
provinceRouter.patch("/:id", validateRequest({ body: updateProvinceBodySchema }), provinceController.update);
provinceRouter.delete("/:id", provinceController.delete);

// ─── City Routes ──────────────────────────────────────────────────────────────

/**
 * @openapi
 * /cities:
 *   get:
 *     summary: List cities
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: provinceId
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of cities
 */
cityRouter.get("/", cityController.list);
cityRouter.get("/:id", cityController.getById);
cityRouter.post("/", validateRequest({ body: createCityBodySchema }), cityController.create);
cityRouter.patch("/:id", validateRequest({ body: updateCityBodySchema }), cityController.update);
cityRouter.delete("/:id", cityController.delete);

// ─── District Routes ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /districts:
 *   get:
 *     summary: List districts
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: cityId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated list of districts
 */
districtRouter.get("/", districtController.list);
districtRouter.get("/:id", districtController.getById);
districtRouter.post("/", validateRequest({ body: createDistrictBodySchema }), districtController.create);
districtRouter.patch("/:id", validateRequest({ body: updateDistrictBodySchema }), districtController.update);
districtRouter.delete("/:id", districtController.delete);
