import { ApiError } from "../../errors/api-error.js";
import { businessRepository } from "../businesses/business.repository.js";
import type { CreateServiceBody, ListServicesQuery, UpdateServiceBody } from "./service.schema.js";
import { serviceRepository } from "./service.repository.js";

export const serviceService = {
  list: async (businessId: string, query: ListServicesQuery) => {
    const { page, limit, active } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(active !== undefined && { active: active === "true" }),
    };

    const [items, total] = await Promise.all([
      serviceRepository.findMany(businessId, skip, limit, where),
      serviceRepository.count(businessId, where),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: string, businessId: string) => {
    const service = await serviceRepository.findById(id, businessId);
    if (!service) throw ApiError.notFound("Service not found");
    return service;
  },

  create: async (businessId: string, data: CreateServiceBody) => {
    const business = await businessRepository.findById(businessId);
    if (!business) throw ApiError.notFound("Business not found");
    return serviceRepository.create(businessId, data);
  },

  update: async (id: string, businessId: string, data: UpdateServiceBody) => {
    await serviceService.getById(id, businessId);
    return serviceRepository.update(id, data);
  },

  delete: async (id: string, businessId: string) => {
    await serviceService.getById(id, businessId);
    return serviceRepository.delete(id);
  },
};
