import { z } from "zod";

import { paginationQuerySchema } from "@woyab/shared";

export const createUserBodySchema = z.object({
  phone: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  avatarUrl: z.string().optional(),
  role: z.enum(["USER", "OWNER", "ADMIN", "SUPER_ADMIN"]).optional(),
  active: z.boolean().optional(),
});

export const updateUserBodySchema = createUserBodySchema.partial();

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(["USER", "OWNER", "ADMIN", "SUPER_ADMIN"]).optional(),
  active: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
