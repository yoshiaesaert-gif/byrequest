# ByRequest: one container with the web app, migrations and the release worker.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# One id per build: the browser notices a new release and reloads cleanly instead of calling old server code.
RUN date +%s > .build-id && npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
