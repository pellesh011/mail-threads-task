FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate 2>/dev/null || true
COPY tsconfig.json ./
COPY src ./src

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --include-dev
COPY --from=build /app/src ./src
RUN rm -rf dist
CMD ["npx", "tsx", "src/index.ts"]
