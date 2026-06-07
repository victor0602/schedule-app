# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/

RUN pnpm install --frozen-lockfile

# Source
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY apps/mobile apps/mobile
COPY packages/shared packages/shared

# Build API
RUN cd apps/api && npx nest build

# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build Expo Web (optional — skip if expo export fails)
RUN cd apps/mobile && npx expo export --platform web 2>/dev/null && echo "Web build OK" || echo "Web build skipped (expo not available)"

# Stage 2: Run
FROM node:20-alpine AS run
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# API
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
COPY --from=build /app/apps/api/prisma ./prisma

# Shared
COPY --from=build /app/packages ./packages
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=build /app/node_modules ./node_modules

# Web build (if generated)
COPY --from=build /app/apps/mobile/dist ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]