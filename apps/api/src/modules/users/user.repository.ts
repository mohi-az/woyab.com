import { prisma } from "../../lib/prisma.js";
import type { CreateUserBody, UpdateUserBody } from "./user.schema.js";

export const userRepository = {
  findMany: (
    skip: number,
    take: number,
    where: {
      role?: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
      active?: boolean;
      OR?: Array<{ phone?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } }>;
    } = {},
  ) =>
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { businesses: true, reviews: true } },
      },
    }),

  count: (
    where: {
      role?: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
      active?: boolean;
      OR?: Array<{ phone?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } }>;
    } = {},
  ) => prisma.user.count({ where }),

  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { businesses: true, reviews: true } },
      },
    }),

  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findByPhone: (phone: string) => prisma.user.findUnique({ where: { phone } }),

  create: (data: CreateUserBody) => prisma.user.create({ data }),

  update: (id: string, data: UpdateUserBody) =>
    prisma.user.update({ where: { id }, data }),

  delete: (id: string) => prisma.user.delete({ where: { id } }),
};
