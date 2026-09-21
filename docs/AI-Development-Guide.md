# woYab AI Development Guide

## Project Overview

woYab is a long-term business directory platform for Iranian businesses in Germany.

The platform allows users to discover and search businesses such as doctors, pharmacies, laboratories, restaurants, cafés, supermarkets, bookstores, lawyers, gyms, beauty salons, repair shops, and other Iranian-owned businesses.

The project consists of four separate applications/packages inside a monorepo.

```
apps/
    api/
    mobile/

packages/
    database/
    shared/
```

---

## Applications

### api

Express.js backend application written in TypeScript.

Responsible for:

* REST APIs
* Authentication
* Business Logic
* Authorization
* File Upload
* Search
* Notifications

---

### mobile

React Native (Expo) application.

Consumes backend REST APIs only.

---

### database

Contains the Prisma schema, migrations, Prisma Client, and all database-related logic.

No business logic should be placed here.

---

### shared

Contains reusable code shared between multiple applications.

Examples:

* Types
* Constants
* Validation Schemas
* Enums
* Shared Utility Functions

Only place code here if it is used by more than one project.

Do not duplicate shared logic between applications.

---

# Technology Stack

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* Prisma
* Zod
* Swagger (OpenAPI)
* AWS S3
* Docker

---

# Development Principles

Always write clean, modular, and maintainable code.

Prefer readability over clever implementations.

Keep functions small and focused.

Avoid duplicated logic.

Use dependency injection where appropriate.

Business logic must never exist inside route files.

---

# Validation

Use Zod for request validation.

Validate every request before reaching the service layer.

Never trust client input.

---

# Database

All database access must go through Prisma.

Avoid raw SQL unless absolutely necessary.

Never access the database directly from routes.

---

# API Structure

Follow a layered architecture.

```
Route
↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

PostgreSQL
```

Each layer has a single responsibility.

---

# Shared Package

Before creating any new type, constant, enum, or validation schema, check whether it already exists inside the shared package.

If a piece of code is used by multiple applications, move it into the shared package instead of duplicating it.

The shared package is the single source of truth for reusable code.

---

# Coding Style

* Use TypeScript strict mode.
* Avoid `any`.
* Use async/await.
* Handle errors properly.
* Keep naming consistent.
* Write self-explanatory code.
* Prefer composition over inheritance.

---

# AI Instructions

Before generating new code:

1. Follow the existing project structure.
2. Reuse existing code whenever possible.
3. Do not duplicate business logic.
4. Keep modules independent.
5. Follow existing naming conventions.
6. Keep code production-ready.
7. Prefer scalable solutions over quick fixes.
8. If multiple implementations are possible, choose the most maintainable one.
9. Keep the codebase consistent with previous implementations.

This document should be treated as the project's primary development guideline.
