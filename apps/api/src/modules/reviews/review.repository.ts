import { prisma } from "../../lib/prisma.js";
import type { CreateReviewBody, UpdateReviewBody } from "./review.schema.js";

export const reviewRepository = {
  findMany: (businessId: string, skip: number, take: number) =>
    prisma.review.findMany({
      where: {
        businessId,
        status: "APPROVED",
        business: { removedAt: null, status: "ACTIVE" },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        images: true,
        ownerReply: {
          select: { id: true, content: true, createdAt: true, updatedAt: true },
        },
      },
    }),

  count: (businessId: string) =>
    prisma.review.count({
      where: {
        businessId,
        status: "APPROVED",
        business: { removedAt: null, status: "ACTIVE" },
      },
    }),

  findById: (id: string) =>
    prisma.review.findFirst({
      where: {
        id,
        status: "APPROVED",
        business: { removedAt: null, status: "ACTIVE" },
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        business: { select: { id: true, slug: true, businessName: true } },
        images: true,
        ownerReply: {
          select: { id: true, content: true, createdAt: true, updatedAt: true },
        },
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
