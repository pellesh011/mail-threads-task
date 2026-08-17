FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate 2>/dev/null || true
COPY tsconfig.json ./
COPY src ./src
# Skip tsc build, use tsx for runtime directly

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# Install with dev deps for tsx, then prune
RUN npm ci --include-dev
COPY --from=build /app/src ./src
# Remove dist since we'll use tsx directly
RUN rm -rf dist
CMD ["npx", "tsx", "src/main.ts"]
