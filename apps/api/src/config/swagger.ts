import swaggerJSDoc from "swagger-jsdoc";

import { env } from "./env.js";

export const openApiSpec = swaggerJSDoc({
  apis: ["src/routes/**/*.ts", "src/modules/**/*.ts", "dist/routes/**/*.js", "dist/modules/**/*.js"],
  definition: {
    openapi: "3.0.0",
    info: {
      title: env.APP_NAME,
      version: env.API_VERSION,
    },
    servers: [
      {
        url: `/${env.API_VERSION}`,
      },
    ],
    components: {
      schemas: {
        ApiError: {
          type: "object",
          required: ["success", "error"],
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Request validation failed" },
                requestId: { type: "string", example: "req_123" },
                details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string", example: "body.email" },
                      message: { type: "string", example: "Invalid email address" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
