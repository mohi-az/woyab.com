import path from "node:path";
import { fileURLToPath } from "node:url";

import swaggerJSDoc from "swagger-jsdoc";

import { env } from "./env.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(currentDirectory, "..");
const distRoot = path.resolve(currentDirectory, "../../dist");
const toGlobPath = (targetPath: string) => targetPath.replaceAll("\\", "/");

export const openApiSpec = swaggerJSDoc({
  apis: [
    toGlobPath(path.join(sourceRoot, "routes/**/*.ts")),
    toGlobPath(path.join(sourceRoot, "modules/**/*.ts")),
    toGlobPath(path.join(distRoot, "routes/**/*.js")),
    toGlobPath(path.join(distRoot, "modules/**/*.js")),
  ],
  definition: {
    openapi: "3.0.0",
    info: {
      title: env.APP_NAME,
      version: env.API_VERSION,
      description: "Interactive API documentation for WoYab. Use Swagger UI to inspect and test endpoints directly.",
    },
    servers: [
      {
        url: `/${env.API_VERSION}`,
        description: "Current API version",
      },
      {
        url: `http://localhost:${env.PORT}/${env.API_VERSION}`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        internalApi: {
          type: "apiKey",
          in: "header",
          name: "x-woyab-internal-secret",
          description: "Server-to-server credential for internal integration endpoints.",
        },
      },
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
    tags: [
      { name: "System", description: "Health and system endpoints" },
      { name: "Users", description: "User management endpoints" },
      { name: "Categories", description: "Category, sub-category, and specialty endpoints" },
      { name: "Businesses", description: "Business directory endpoints" },
      { name: "Services", description: "Business service endpoints" },
      { name: "Reviews", description: "Review endpoints" },
      { name: "Tags", description: "Tag management endpoints" },
      { name: "Locations", description: "Country, province, city, and district endpoints" },
      { name: "Geo", description: "Geocoding and protected Google Places integration endpoints" },
    ],
  },
});
