import { ApiError } from "../../errors/api-error.js";
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from "./user.schema.js";
import { userRepository } from "./user.repository.js";

export const userService = {
  list: async (query: ListUsersQuery) => {
    const { page, limit, role, active, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(role && { role }),
      ...(active !== undefined && { active: active === "true" }),
      ...(search && {
        OR: [
          { phone: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      userRepository.findMany(skip, limit, where),
      userRepository.count(where),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound("User not found");
    return user;
  },

  create: async (data: CreateUserBody) => {
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw ApiError.conflict("A user with this email already exists");
    }
    if (data.phone) {
      const existing = await userRepository.findByPhone(data.phone);
      if (existing) throw ApiError.conflict("A user with this phone already exists");
    }
    return userRepository.create(data);
  },

  update: async (id: string, data: UpdateUserBody) => {
    await userService.getById(id);
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing && existing.id !== id) throw ApiError.conflict("A user with this email already exists");
    }
    if (data.phone) {
      const existing = await userRepository.findByPhone(data.phone);
      if (existing && existing.id !== id) throw ApiError.conflict("A user with this phone already exists");
    }
    return userRepository.update(id, data);
  },

  delete: async (id: string) => {
    await userService.getById(id);
    return userRepository.delete(id);
  },
};
