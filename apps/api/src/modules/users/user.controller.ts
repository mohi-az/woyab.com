import type { Request, Response } from "express";
import { createUserBodySchema, listUsersQuerySchema, updateUserBodySchema, userIdParamsSchema } from "./user.schema.js";
import { userService } from "./user.service.js";

export const userController = {
  list: async (req: Request, res: Response) => {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await userService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = userIdParamsSchema.parse(req.params);
    const user = await userService.getById(id);
    res.json({ success: true, data: user });
  },

  create: async (req: Request, res: Response) => {
    const body = createUserBodySchema.parse(req.body);
    const user = await userService.create(body);
    res.status(201).json({ success: true, data: user });
  },

  update: async (req: Request, res: Response) => {
    const { id } = userIdParamsSchema.parse(req.params);
    const body = updateUserBodySchema.parse(req.body);
    const user = await userService.update(id, body);
    res.json({ success: true, data: user });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = userIdParamsSchema.parse(req.params);
    await userService.delete(id);
    res.status(204).send();
  },
};
