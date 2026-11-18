# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# build: bağımlılıkları kurar ve Next.js uygulamasını "standalone" çıktıyla derler.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# package-lock.json npm 10.9 ile oluşturuldu; Node 20 imajındaki npm 10.8 kilit
# dosyasını farklı yorumlayıp "npm ci"yi reddettiği için aynı sürüm kullanılır.
RUN npm install -g npm@10.9.0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_ değişkenleri build sırasında tarayıcı koduna gömülür; bu yüzden
# backend adresi çalışma zamanında değil, build argümanı olarak verilir.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------------------
# production: yalnızca standalone sunucu ve statik dosyalar.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

# standalone klasörü server.js ve gerekli node_modules dosyalarını içerir;
# statik dosyalar ayrıca kopyalanmalıdır.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

# Healthcheck docker-compose.yml içinde tanımlıdır.
CMD ["node", "server.js"]
