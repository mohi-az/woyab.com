import { prisma } from "../../lib/prisma.js";
import type { CreateServiceBody, UpdateServiceBody } from "./service.schema.js";

export const serviceRepository = {
  findMany: (businessId: string, skip: number, take: number, where: { active?: boolean } = {}) =>
    prisma.service.findMany({
      where: { businessId, ...where },
      skip,
      take,
      orderBy: { sortOrder: "asc" },
    }),

  count: (businessId: string, where: { active?: boolean } = {}) =>
    prisma.service.count({ where: { businessId, ...where } }),

  findById: (id: string, businessId: string) =>
    prisma.service.findFirst({ where: { id, businessId } }),

  create: (businessId: string, data: CreateServiceBody) =>
    prisma.service.create({ data: { ...data, businessId } }),

  update: (id: string, data: UpdateServiceBody) =>
    prisma.service.update({ where: { id }, data }),

  delete: (id: string) => prisma.service.delete({ where: { id } }),
};
