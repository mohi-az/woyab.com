import { ApiError } from "../../errors/api-error.js";
import { businessRepository } from "../businesses/business.repository.js";
import type { CreateReviewBody, ListReviewsQuery, UpdateReviewBody } from "./review.schema.js";
import { reviewRepository } from "./review.repository.js";

export const reviewService = {
  list: async (businessId: string, query: ListReviewsQuery) => {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      reviewRepository.findMany(businessId, skip, limit, where),
      reviewRepository.count(businessId, where),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: string) => {
    const review = await reviewRepository.findById(id);
    if (!review) throw ApiError.notFound("Review not found");
    return review;
  },

  create: async (businessId: string, data: CreateReviewBody) => {
    const business = await businessRepository.findById(businessId);
    if (!business) throw ApiError.notFound("Business not found");

    const existing = await reviewRepository.findByBusinessAndUser(businessId, data.userId);
    if (existing) throw ApiError.conflict("You have already reviewed this business");

    return reviewRepository.create(businessId, data);
  },

  update: async (id: string, data: UpdateReviewBody) => {
    await reviewService.getById(id);
    return reviewRepository.update(id, data);
  },

  delete: async (id: string) => {
    await reviewService.getById(id);
    return reviewRepository.delete(id);
  },
};
