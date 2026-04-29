# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Build the application ──────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before building
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Increase heap size to prevent OOM during Next.js build
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy Next.js standalone build output
COPY --from=builder /app/public           ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

# Copy Prisma schema + migrations + docker seed script
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy full node_modules so Prisma CLI (v7) has all its transitive deps
# (e.g. @prisma/config requires 'effect', which is not in the standalone bundle)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
