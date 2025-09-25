# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# If you emit logs to stdout/stderr:
ENV PORT=4000

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy app source
COPY . .

# Optional: healthcheck for local/ecs
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

EXPOSE 4000
CMD ["node", "server.js"]
