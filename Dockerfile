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

# Runtime deps: prisma CLI (for `prisma db push` in entrypoint) and bcryptjs
# (used by auth at runtime; not traced into .next/standalone). Clean the npm
# cache in the same layer so the downloaded tarballs aren't baked into the image.
RUN npm install --no-save prisma@7.5.0 bcryptjs && npm cache clean --force

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# su-exec only: drops privileges in entrypoint. Highlights cron runs on the
# host droplet (see deploy/cron-trigger.sh), not in-container — the bundled
# dcron daemon wedged and never fired. Healthcheck uses busybox wget, so curl
# is not needed either.
RUN apk add --no-cache su-exec

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
