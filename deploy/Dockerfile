# syntax=docker/dockerfile:1.7
FROM node:22.23.2-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.9.0
WORKDIR /app

FROM base AS dependencies
COPY package.json ./
COPY deploy/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY deploy/pnpm-lock.yaml ./pnpm-lock.yaml
COPY apps/api/package.json ./apps/api/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN --mount=type=cache,id=woyab-pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM dependencies AS source
COPY apps/api ./apps/api
COPY apps/frontend ./apps/frontend
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
# Nested workspace files have historically diverged; container installs use only deploy's lock.
RUN rm -f apps/frontend/pnpm-workspace.yaml packages/database/pnpm-workspace.yaml
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN pnpm --filter @woyab/shared build && pnpm --filter @woyab/database generate

FROM source AS api-build
RUN pnpm --filter api exec tsc

FROM dependencies AS api-production-dependencies
RUN pnpm install --prod --frozen-lockfile

FROM base AS api
ENV NODE_ENV=production PORT=4000
COPY --from=api-production-dependencies --chown=node:node /app /app
COPY --from=api-build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=api-build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=api-build --chown=node:node /app/packages/database/generated ./packages/database/generated
WORKDIR /app/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]

FROM source AS frontend-build
ARG APP_REVISION
ARG NEXT_PUBLIC_APP_URL=https://woyab.com
ARG NEXT_PUBLIC_API_URL=https://api.woyab.com
ARG NEXT_PUBLIC_SENTRY_DSN
ENV APP_REVISION=$APP_REVISION NEXT_DEPLOYMENT_ID=$APP_REVISION \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN NEXT_TELEMETRY_DISABLED=1
# Next generates its internal action key per image. deploymentId handles version skew.
# No user production DB, auth, OAuth or encryption credentials are available at build.
RUN AUTH_SECRET=isolated-build-only-not-a-production-secret \
    pnpm --filter frontend exec next build

FROM frontend-build AS verification
RUN pnpm --filter api exec tsc \
    && node --test apps/api/tests/*.test.mjs apps/frontend/tests/*.test.mjs packages/shared/tests/*.test.mjs

FROM node:22.23.2-bookworm-slim AS frontend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=frontend-build --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=frontend-build --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=frontend-build --chown=node:node /app/apps/frontend/public ./apps/frontend/public
WORKDIR /app/apps/frontend
USER node
EXPOSE 3000
CMD ["node", "server.js"]
