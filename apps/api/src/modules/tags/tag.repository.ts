import type { Prisma } from "@woyab/database";

import { prisma } from "../../lib/prisma.js";
import type { CreateTagBody, UpdateTagBody } from "./tag.schema.js";

type TagFilter = Prisma.TagWhereInput;

export const tagRepository = {
  findMany: (skip: number, take: number, where: TagFilter = {}) =>
    prisma.tag.findMany({
      where,
      skip,
      take,
      orderBy: { nameFa: "asc" },
      include: { _count: { select: { businesses: { where: { business: { status: "ACTIVE", verified: true, removedAt: null } } } } } },
    }),

  count: (where: TagFilter = {}) => prisma.tag.count({ where }),

  findById: (id: number) =>
    prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { businesses: { where: { business: { status: "ACTIVE", verified: true, removedAt: null } } } } } },
    }),

  findBySlug: (slug: string) => prisma.tag.findUnique({ where: { slug } }),

  findByNameFa: (nameFa: string) => prisma.tag.findUnique({ where: { nameFa } }),

  create: (data: CreateTagBody) => prisma.tag.create({ data }),

  update: (id: number, data: UpdateTagBody) =>
    prisma.tag.update({ where: { id }, data }),

  delete: (id: number) => prisma.tag.delete({ where: { id } }),
};
