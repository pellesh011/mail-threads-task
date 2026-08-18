FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://worker:worker@db:5432/mailthreads

COPY package.json package-lock.json ./
COPY package/shared/package.json package/shared/package.json
COPY worker/package.json worker/package.json
COPY exporter/package.json exporter/package.json

RUN npm ci --include=dev

COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY package/shared package/shared
COPY worker worker

RUN npx prisma generate

CMD ["npx", "tsx", "worker/src/main.ts"]