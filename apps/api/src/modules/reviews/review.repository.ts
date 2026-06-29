import { prisma } from "../../lib/prisma.js";
import type { CreateReviewBody, UpdateReviewBody } from "./review.schema.js";

export const reviewRepository = {
  findMany: (businessId: string, skip: number, take: number, where: { status?: "PENDING" | "APPROVED" | "REJECTED" } = {}) =>
    prisma.review.findMany({
      where: { businessId, ...where },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        images: true,
      },
    }),

  count: (businessId: string, where: { status?: "PENDING" | "APPROVED" | "REJECTED" } = {}) =>
    prisma.review.count({ where: { businessId, ...where } }),

  findById: (id: string) =>
    prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        business: { select: { id: true, slug: true, businessName: true } },
        images: true,
      },
    }),

  findByBusinessAndUser: (businessId: string, userId: string) =>
    prisma.review.findUnique({ where: { businessId_userId: { businessId, userId } } }),

  create: (businessId: string, data: CreateReviewBody) =>
    prisma.review.create({ data: { ...data, businessId } }),

  update: (id: string, data: UpdateReviewBody) =>
    prisma.review.update({ where: { id }, data }),

  delete: (id: string) => prisma.review.delete({ where: { id } }),
};
