# 1) Build
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# no build step for pure Node API; if you transpile TypeScript, run it here

# 2) Runtime
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
# non-root user is good practice (optional)
# RUN useradd -ms /bin/bash nodeuser
# USER nodeuser
EXPOSE 4000
CMD ["node", "server.js"]
