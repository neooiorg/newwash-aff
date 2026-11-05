FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci
RUN mkdir -p /realtime \
  && cd /realtime \
  && npm init -y \
  && npm install --omit=dev --ignore-scripts pg@8.23.1 ws@8.22.1 \
  && npm cache clean --force

FROM base AS builder

ARG NEXT_PUBLIC_REALTIME_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
ENV HUSKY=0
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=dependencies --chown=nextjs:nodejs /realtime /realtime
COPY --from=builder --chown=nextjs:nodejs /app/scripts/realtime-server.mjs /realtime/realtime-server.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-standalone.mjs ./scripts/run-standalone.mjs

USER nextjs
EXPOSE 3000 3002

CMD ["node", "scripts/run-standalone.mjs"]

