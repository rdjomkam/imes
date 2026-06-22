# syntax=docker/dockerfile:1.6
# ---- Multi-stage build for the IMES Consulting demo (Coolify-ready) ----
# Stage 1 : install production dependencies in isolation.
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# Stage 2 : final runtime image.
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Reasonable default Node sizing for ~50 concurrent SSE streams + Claude vision payloads.
ENV NODE_OPTIONS=--max-old-space-size=512

# Non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy installed deps and app sources (in two layers so deps cache well).
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.mjs ./
COPY src ./src
COPY public ./public
COPY company-profile.json ./company-profile.json

# Persistent profile target — mount a volume here to keep the learned profile
# across redeploys. The app seeds the file from company-profile.json on first use.
RUN mkdir -p /data && chown -R app:app /data /app
ENV PROFILE_PATH=/data/company-profile.json
VOLUME ["/data"]

USER app
EXPOSE 5174
# PORT is provided by Coolify at runtime; the server reads process.env.PORT.
CMD ["node", "server.mjs"]
