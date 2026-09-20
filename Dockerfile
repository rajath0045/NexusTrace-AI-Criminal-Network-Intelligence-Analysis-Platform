FROM node:22.13.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Prisma generation needs only a syntactically valid URL; no deployment secret is baked into the image.
ENV DATABASE_URL="postgresql://build-only:build-only@localhost:5432/nexustrace?schema=public"
ENV APP_ORIGIN="http://localhost:3000"
ENV EVIDENCE_STORAGE_ROOT="/tmp/nexustrace-build-evidence"
RUN pnpm build

FROM base AS runtime-dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22.13.0-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 nexustrace && useradd --system --uid 1001 --gid nexustrace nexustrace \
  && mkdir -p /var/lib/nexustrace/evidence && chown -R nexustrace:nexustrace /var/lib/nexustrace
COPY --from=runtime-dependencies --chown=nexustrace:nexustrace /app/node_modules ./node_modules
COPY --from=builder --chown=nexustrace:nexustrace /app/.next/standalone ./
COPY --from=builder --chown=nexustrace:nexustrace /app/.next/static ./.next/static
COPY --from=builder --chown=nexustrace:nexustrace /app/package.json ./package.json
COPY --from=builder --chown=nexustrace:nexustrace /app/scripts ./scripts
USER nexustrace
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "scripts/start-production.mjs"]
