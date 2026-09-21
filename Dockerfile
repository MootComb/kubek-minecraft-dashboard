# syntax=docker/dockerfile:1

FROM oven/bun:debian

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      tzdata \
      libstdc++6 \
      curl \
      procps \
      fontconfig \
      fonts-dejavu-core \
      fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY frontend/package.json frontend/bun.lock ./frontend/
COPY backend/package.json backend/bun.lock ./backend/

RUN bun install --frozen-lockfile \
 && (cd frontend && bun install --frozen-lockfile) \
 && (cd backend && bun install --frozen-lockfile)

COPY . .

WORKDIR /data
VOLUME ["/data"]

ENV PORT=8000
EXPOSE 8000

CMD cd /app && \
    echo "🔨 Building Kubek from source..." && \
    echo "⚡ Compiling application..." && \
    bun run build --platform native && \
    echo "✅ Build complete! Starting Kubek..." && \
    exec /app/dist/Kubek-*-native