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

/**
 * @openapi
 * /countries:
 *   post:
 *     summary: Create a country
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nameFa, nameEn, code]
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               code: { type: string, minLength: 2, maxLength: 2 }
 *               active: { type: boolean }
 *     responses:
 *       201:
 *         description: Country created
 */
countryRouter.post("/", validateRequest({ body: createCountryBodySchema }), countryController.create);

/**
 * @openapi
 * /countries/{id}:
 *   patch:
 *     summary: Update a country
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               code: { type: string, minLength: 2, maxLength: 2 }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated country
 *       404:
 *         description: Country not found
 */
countryRouter.patch("/:id", validateRequest({ body: updateCountryBodySchema }), countryController.update);

/**
 * @openapi
 * /countries/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Country deleted
 *       404:
 *         description: Country not found
 */
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

/**
 * @openapi
 * /provinces/{id}:
 *   get:
 *     summary: Get a province by ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Province details
 *       404:
 *         description: Province not found
 */
provinceRouter.get("/:id", provinceController.getById);

/**
 * @openapi
 * /provinces:
 *   post:
 *     summary: Create a province
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nameFa, nameEn, slug, countryId]
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *               countryId: { type: integer }
 *     responses:
 *       201:
 *         description: Province created
 */
provinceRouter.post("/", validateRequest({ body: createProvinceBodySchema }), provinceController.create);

/**
 * @openapi
 * /provinces/{id}:
 *   patch:
 *     summary: Update a province
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *               countryId: { type: integer }
 *     responses:
 *       200:
 *         description: Updated province
 *       404:
 *         description: Province not found
 */
provinceRouter.patch("/:id", validateRequest({ body: updateProvinceBodySchema }), provinceController.update);

/**
 * @openapi
 * /provinces/{id}:
 *   delete:
 *     summary: Delete a province
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Province deleted
 *       404:
 *         description: Province not found
 */
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

/**
 * @openapi
 * /cities/{id}:
 *   get:
 *     summary: Get a city by ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: City details
 *       404:
 *         description: City not found
 */
cityRouter.get("/:id", cityController.getById);

/**
 * @openapi
 * /cities:
 *   post:
 *     summary: Create a city
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nameFa, nameEn, slug, provinceId]
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *               provinceId: { type: integer }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       201:
 *         description: City created
 */
cityRouter.post("/", validateRequest({ body: createCityBodySchema }), cityController.create);

/**
 * @openapi
 * /cities/{id}:
 *   patch:
 *     summary: Update a city
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *               provinceId: { type: integer }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       200:
 *         description: Updated city
 *       404:
 *         description: City not found
 */
cityRouter.patch("/:id", validateRequest({ body: updateCityBodySchema }), cityController.update);

/**
 * @openapi
 * /cities/{id}:
 *   delete:
 *     summary: Delete a city
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: City deleted
 *       404:
 *         description: City not found
 */
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

/**
 * @openapi
 * /districts/{id}:
 *   get:
 *     summary: Get a district by ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: District details
 *       404:
 *         description: District not found
 */
districtRouter.get("/:id", districtController.getById);

/**
 * @openapi
 * /districts:
 *   post:
 *     summary: Create a district
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nameFa, cityId]
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               cityId: { type: integer }
 *     responses:
 *       201:
 *         description: District created
 */
districtRouter.post("/", validateRequest({ body: createDistrictBodySchema }), districtController.create);

/**
 * @openapi
 * /districts/{id}:
 *   patch:
 *     summary: Update a district
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               cityId: { type: integer }
 *     responses:
 *       200:
 *         description: Updated district
 *       404:
 *         description: District not found
 */
districtRouter.patch("/:id", validateRequest({ body: updateDistrictBodySchema }), districtController.update);

/**
 * @openapi
 * /districts/{id}:
 *   delete:
 *     summary: Delete a district
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: District deleted
 *       404:
 *         description: District not found
 */
districtRouter.delete("/:id", districtController.delete);
