import type { Request, Response } from "express";

import {
  cityIdParamsSchema,
  countryIdParamsSchema,
  createCityBodySchema,
  createCountryBodySchema,
  createDistrictBodySchema,
  createProvinceBodySchema,
  districtIdParamsSchema,
  listCitiesQuerySchema,
  listDistrictsQuerySchema,
  listProvincesQuerySchema,
  provinceIdParamsSchema,
  updateCityBodySchema,
  updateCountryBodySchema,
  updateDistrictBodySchema,
  updateProvinceBodySchema,
} from "./location.schema.js";
import { cityService, countryService, districtService, provinceService } from "./location.service.js";

// ─── Country Controllers ──────────────────────────────────────────────────────

export const countryController = {
  list: async (_req: Request, res: Response) => {
    const countries = await countryService.list();
    res.json({ success: true, data: countries });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = countryIdParamsSchema.parse(req.params);
    const country = await countryService.getById(id);
    res.json({ success: true, data: country });
  },

  create: async (req: Request, res: Response) => {
    const body = createCountryBodySchema.parse(req.body);
    const country = await countryService.create(body);
    res.status(201).json({ success: true, data: country });
  },

  update: async (req: Request, res: Response) => {
    const { id } = countryIdParamsSchema.parse(req.params);
    const body = updateCountryBodySchema.parse(req.body);
    const country = await countryService.update(id, body);
    res.json({ success: true, data: country });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = countryIdParamsSchema.parse(req.params);
    await countryService.delete(id);
    res.status(204).send();
  },
};

// ─── Province Controllers ─────────────────────────────────────────────────────

export const provinceController = {
  list: async (req: Request, res: Response) => {
    const query = listProvincesQuerySchema.parse(req.query);
    const result = await provinceService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = provinceIdParamsSchema.parse(req.params);
    const province = await provinceService.getById(id);
    res.json({ success: true, data: province });
  },

  create: async (req: Request, res: Response) => {
    const body = createProvinceBodySchema.parse(req.body);
    const province = await provinceService.create(body);
    res.status(201).json({ success: true, data: province });
  },

  update: async (req: Request, res: Response) => {
    const { id } = provinceIdParamsSchema.parse(req.params);
    const body = updateProvinceBodySchema.parse(req.body);
    const province = await provinceService.update(id, body);
    res.json({ success: true, data: province });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = provinceIdParamsSchema.parse(req.params);
    await provinceService.delete(id);
    res.status(204).send();
  },
};

// ─── City Controllers ─────────────────────────────────────────────────────────

export const cityController = {
  list: async (req: Request, res: Response) => {
    const query = listCitiesQuerySchema.parse(req.query);
    const result = await cityService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = cityIdParamsSchema.parse(req.params);
    const city = await cityService.getById(id);
    res.json({ success: true, data: city });
  },

  create: async (req: Request, res: Response) => {
    const body = createCityBodySchema.parse(req.body);
    const city = await cityService.create(body);
    res.status(201).json({ success: true, data: city });
  },

  update: async (req: Request, res: Response) => {
    const { id } = cityIdParamsSchema.parse(req.params);
    const body = updateCityBodySchema.parse(req.body);
    const city = await cityService.update(id, body);
    res.json({ success: true, data: city });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = cityIdParamsSchema.parse(req.params);
    await cityService.delete(id);
    res.status(204).send();
  },
};

// ─── District Controllers ─────────────────────────────────────────────────────

export const districtController = {
  list: async (req: Request, res: Response) => {
    const query = listDistrictsQuerySchema.parse(req.query);
    const result = await districtService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = districtIdParamsSchema.parse(req.params);
    const district = await districtService.getById(id);
    res.json({ success: true, data: district });
  },

  create: async (req: Request, res: Response) => {
    const body = createDistrictBodySchema.parse(req.body);
    const district = await districtService.create(body);
    res.status(201).json({ success: true, data: district });
  },

  update: async (req: Request, res: Response) => {
    const { id } = districtIdParamsSchema.parse(req.params);
    const body = updateDistrictBodySchema.parse(req.body);
    const district = await districtService.update(id, body);
    res.json({ success: true, data: district });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = districtIdParamsSchema.parse(req.params);
    await districtService.delete(id);
    res.status(204).send();
  },
};
