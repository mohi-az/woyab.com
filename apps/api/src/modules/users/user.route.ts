import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { userController } from "./user.controller.js";
import { createUserBodySchema, updateUserBodySchema } from "./user.schema.js";

export const userRouter = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, OWNER, ADMIN, SUPER_ADMIN] }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
userRouter.get("/", userController.list);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: User not found
 */
userRouter.get("/:id", userController.getById);

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone: { type: string }
 *               email: { type: string }
 *               name: { type: string }
 *               role: { type: string, enum: [USER, OWNER, ADMIN, SUPER_ADMIN] }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Duplicate email or phone
 */
userRouter.post("/", validateRequest({ body: createUserBodySchema }), userController.create);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone: { type: string }
 *               email: { type: string }
 *               name: { type: string }
 *               avatarUrl: { type: string }
 *               role: { type: string, enum: [USER, OWNER, ADMIN, SUPER_ADMIN] }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated user
 *       404:
 *         description: User not found
 */
userRouter.patch("/:id", validateRequest({ body: updateUserBodySchema }), userController.update);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
userRouter.delete("/:id", userController.delete);
