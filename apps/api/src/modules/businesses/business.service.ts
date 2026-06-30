import { ApiError } from "../../errors/api-error.js";
import type { CreateBusinessBody, ListBusinessesQuery, UpdateBusinessBody } from "./business.schema.js";
import { businessRepository } from "./business.repository.js";

export const businessService = {
  list: async (query: ListBusinessesQuery) => {
    const { page, limit, categoryId, subCategoryId, cityId, status, featured, verified, search, sortBy } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(categoryId !== undefined && { categoryId }),
      ...(subCategoryId !== undefined && { subCategoryId }),
      ...(cityId !== undefined && { cityId }),
      ...(status && { status }),
      ...(featured !== undefined && { featured: featured === "true" }),
      ...(verified !== undefined && { verified: verified === "true" }),
      ...(search && {
        OR: [
          { businessName: { contains: search, mode: "insensitive" as const } },
          { shortDescription: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      businessRepository.findMany(skip, limit, where, sortBy),
      businessRepository.count(where),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: string) => {
    const business = await businessRepository.findById(id);
    if (!business) throw ApiError.notFound("Business not found");
    return business;
  },

  getBySlug: async (slug: string) => {
    const business = await businessRepository.findBySlug(slug);
    if (!business) throw ApiError.notFound("Business not found");
    return business;
  },

  create: async (data: CreateBusinessBody) => {
    const existing = await businessRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`Business with slug "${data.slug}" already exists`);
    return businessRepository.create(data);
  },

  update: async (id: string, data: UpdateBusinessBody) => {
    await businessService.getById(id);
    if (data.slug) {
      const existing = await businessRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Business with slug "${data.slug}" already exists`);
    }
    return businessRepository.update(id, data);
  },

  delete: async (id: string) => {
    await businessService.getById(id);
    return businessRepository.delete(id);
  },
};
