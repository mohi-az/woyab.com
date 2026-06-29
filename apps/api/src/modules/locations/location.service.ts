import { ApiError } from "../../errors/api-error.js";
import type {
  CreateCityBody,
  CreateCountryBody,
  CreateDistrictBody,
  CreateProvinceBody,
  ListCitiesQuery,
  ListDistrictsQuery,
  ListProvincesQuery,
  UpdateCityBody,
  UpdateCountryBody,
  UpdateDistrictBody,
  UpdateProvinceBody,
} from "./location.schema.js";
import { cityRepository, countryRepository, districtRepository, provinceRepository } from "./location.repository.js";

// ─── Country Service ──────────────────────────────────────────────────────────

export const countryService = {
  list: async () => countryRepository.findMany(),

  getById: async (id: number) => {
    const country = await countryRepository.findById(id);
    if (!country) throw ApiError.notFound("Country not found");
    return country;
  },

  create: async (data: CreateCountryBody) => {
    const existing = await countryRepository.findByCode(data.code);
    if (existing) throw ApiError.conflict(`Country with code "${data.code}" already exists`);
    return countryRepository.create(data);
  },

  update: async (id: number, data: UpdateCountryBody) => {
    await countryService.getById(id);
    if (data.code) {
      const existing = await countryRepository.findByCode(data.code);
      if (existing && existing.id !== id) throw ApiError.conflict(`Country with code "${data.code}" already exists`);
    }
    return countryRepository.update(id, data);
  },

  delete: async (id: number) => {
    await countryService.getById(id);
    return countryRepository.delete(id);
  },
};

// ─── Province Service ─────────────────────────────────────────────────────────

export const provinceService = {
  list: async (query: ListProvincesQuery) => {
    const { page, limit, countryId } = query;
    const skip = (page - 1) * limit;
    const where = { ...(countryId !== undefined && { countryId }) };
    const [items, total] = await Promise.all([
      provinceRepository.findMany(skip, limit, where),
      provinceRepository.count(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: number) => {
    const province = await provinceRepository.findById(id);
    if (!province) throw ApiError.notFound("Province not found");
    return province;
  },

  create: async (data: CreateProvinceBody) => {
    const existing = await provinceRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`Province with slug "${data.slug}" already exists`);
    return provinceRepository.create(data);
  },

  update: async (id: number, data: UpdateProvinceBody) => {
    await provinceService.getById(id);
    if (data.slug) {
      const existing = await provinceRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Province with slug "${data.slug}" already exists`);
    }
    return provinceRepository.update(id, data);
  },

  delete: async (id: number) => {
    await provinceService.getById(id);
    return provinceRepository.delete(id);
  },
};

// ─── City Service ─────────────────────────────────────────────────────────────

export const cityService = {
  list: async (query: ListCitiesQuery) => {
    const { page, limit, provinceId, search } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(provinceId !== undefined && { provinceId }),
      ...(search && {
        OR: [
          { nameFa: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      cityRepository.findMany(skip, limit, where),
      cityRepository.count(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: number) => {
    const city = await cityRepository.findById(id);
    if (!city) throw ApiError.notFound("City not found");
    return city;
  },

  create: async (data: CreateCityBody) => {
    const existing = await cityRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`City with slug "${data.slug}" already exists`);
    return cityRepository.create(data);
  },

  update: async (id: number, data: UpdateCityBody) => {
    await cityService.getById(id);
    if (data.slug) {
      const existing = await cityRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`City with slug "${data.slug}" already exists`);
    }
    return cityRepository.update(id, data);
  },

  delete: async (id: number) => {
    await cityService.getById(id);
    return cityRepository.delete(id);
  },
};

// ─── District Service ─────────────────────────────────────────────────────────

export const districtService = {
  list: async (query: ListDistrictsQuery) => {
    const { page, limit, cityId } = query;
    const skip = (page - 1) * limit;
    const where = { ...(cityId !== undefined && { cityId }) };
    const [items, total] = await Promise.all([
      districtRepository.findMany(skip, limit, where),
      districtRepository.count(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: number) => {
    const district = await districtRepository.findById(id);
    if (!district) throw ApiError.notFound("District not found");
    return district;
  },

  create: async (data: CreateDistrictBody) => districtRepository.create(data),

  update: async (id: number, data: UpdateDistrictBody) => {
    await districtService.getById(id);
    return districtRepository.update(id, data);
  },

  delete: async (id: number) => {
    await districtService.getById(id);
    return districtRepository.delete(id);
  },
};
