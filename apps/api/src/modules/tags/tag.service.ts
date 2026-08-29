import { ApiError } from "../../errors/api-error.js";
import type { CreateTagBody, ListTagsQuery, UpdateTagBody } from "./tag.schema.js";
import { tagRepository } from "./tag.repository.js";

export const tagService = {
  list: async (query: ListTagsQuery) => {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const where = {
      businesses: {
        some: { business: { status: "ACTIVE" as const, verified: true, removedAt: null } },
      },
      ...(search && {
        OR: [
          { nameFa: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
          { nameDe: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      tagRepository.findMany(skip, limit, where),
      tagRepository.count(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: number) => {
    const tag = await tagRepository.findById(id);
    if (!tag) throw ApiError.notFound("Tag not found");
    return tag;
  },

  create: async (data: CreateTagBody) => {
    const existingBySlug = await tagRepository.findBySlug(data.slug);
    if (existingBySlug) throw ApiError.conflict(`Tag with slug "${data.slug}" already exists`);
    const existingByName = await tagRepository.findByNameFa(data.nameFa);
    if (existingByName) throw ApiError.conflict(`Tag with name "${data.nameFa}" already exists`);
    return tagRepository.create(data);
  },

  update: async (id: number, data: UpdateTagBody) => {
    await tagService.getById(id);
    if (data.slug) {
      const existing = await tagRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Tag with slug "${data.slug}" already exists`);
    }
    return tagRepository.update(id, data);
  },

  delete: async (id: number) => {
    await tagService.getById(id);
    return tagRepository.delete(id);
  },
};
