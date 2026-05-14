FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile || npm install

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir -p ./public/uploads/avatars && chown -R nextjs:nodejs ./public/uploads
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma schema + config + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json

# Install only prisma CLI and seed deps in runner (avoids cherry-picking transitive deps)
RUN npm install --no-save prisma@7.5.0 tsx bcryptjs dotenv

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
COPY crontab /etc/crontabs/root

RUN apk add --no-cache su-exec dcron curl

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
