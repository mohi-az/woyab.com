import { prisma } from "../../lib/prisma.js";
import type {
  CreateCityBody,
  CreateCountryBody,
  CreateDistrictBody,
  CreateProvinceBody,
  UpdateCityBody,
  UpdateCountryBody,
  UpdateDistrictBody,
  UpdateProvinceBody,
} from "./location.schema.js";

// ─── Country ─────────────────────────────────────────────────────────────────

export const countryRepository = {
  findMany: () =>
    prisma.country.findMany({
      orderBy: { nameEn: "asc" },
      include: { _count: { select: { provinces: true } } },
    }),

  findById: (id: number) =>
    prisma.country.findUnique({
      where: { id },
      include: { provinces: { orderBy: { nameEn: "asc" } } },
    }),

  findByCode: (code: string) => prisma.country.findUnique({ where: { code } }),

  create: (data: CreateCountryBody) => prisma.country.create({ data }),

  update: (id: number, data: UpdateCountryBody) =>
    prisma.country.update({ where: { id }, data }),

  delete: (id: number) => prisma.country.delete({ where: { id } }),
};

// ─── Province ────────────────────────────────────────────────────────────────

export const provinceRepository = {
  findMany: (skip: number, take: number, where: { countryId?: number } = {}) =>
    prisma.province.findMany({
      where,
      skip,
      take,
      orderBy: { nameEn: "asc" },
      include: {
        country: { select: { id: true, nameFa: true, nameEn: true, code: true } },
        _count: { select: { cities: true } },
      },
    }),

  count: (where: { countryId?: number } = {}) => prisma.province.count({ where }),

  findById: (id: number) =>
    prisma.province.findUnique({
      where: { id },
      include: {
        country: { select: { id: true, nameFa: true, nameEn: true, code: true } },
        cities: { orderBy: { nameEn: "asc" } },
      },
    }),

  findBySlug: (slug: string) => prisma.province.findUnique({ where: { slug } }),

  create: (data: CreateProvinceBody) => prisma.province.create({ data }),

  update: (id: number, data: UpdateProvinceBody) =>
    prisma.province.update({ where: { id }, data }),

  delete: (id: number) => prisma.province.delete({ where: { id } }),
};

// ─── City ────────────────────────────────────────────────────────────────────

export const cityRepository = {
  findMany: (
    skip: number,
    take: number,
    where: {
      provinceId?: number;
      OR?: Array<{ nameFa?: { contains: string; mode: "insensitive" }; nameEn?: { contains: string; mode: "insensitive" } }>;
    } = {},
  ) =>
    prisma.city.findMany({
      where,
      skip,
      take,
      orderBy: { nameEn: "asc" },
      include: {
        province: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        _count: { select: { districts: true, businesses: { where: { status: "ACTIVE", removedAt: null } } } },
      },
    }),

  count: (
    where: {
      provinceId?: number;
      OR?: Array<{ nameFa?: { contains: string; mode: "insensitive" }; nameEn?: { contains: string; mode: "insensitive" } }>;
    } = {},
  ) => prisma.city.count({ where }),

  findById: (id: number) =>
    prisma.city.findUnique({
      where: { id },
      include: {
        province: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        districts: { orderBy: { nameFa: "asc" } },
      },
    }),

  findBySlug: (slug: string) => prisma.city.findUnique({ where: { slug } }),

  create: (data: CreateCityBody) => prisma.city.create({ data }),

  update: (id: number, data: UpdateCityBody) =>
    prisma.city.update({ where: { id }, data }),

  delete: (id: number) => prisma.city.delete({ where: { id } }),
};

// ─── District ────────────────────────────────────────────────────────────────

export const districtRepository = {
  findMany: (skip: number, take: number, where: { cityId?: number } = {}) =>
    prisma.district.findMany({
      where,
      skip,
      take,
      orderBy: { nameFa: "asc" },
      include: {
        city: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
      },
    }),

  count: (where: { cityId?: number } = {}) => prisma.district.count({ where }),

  findById: (id: number) =>
    prisma.district.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
      },
    }),

  create: (data: CreateDistrictBody) => prisma.district.create({ data }),

  update: (id: number, data: UpdateDistrictBody) =>
    prisma.district.update({ where: { id }, data }),

  delete: (id: number) => prisma.district.delete({ where: { id } }),
};
