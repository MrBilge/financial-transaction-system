# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# build: bağımlılıkları kurar, Prisma Client'ı üretir ve uygulamayı derler.
# Prisma CLI (devDependency) bu aşamada bulunduğu için docker-compose'daki
# "migrate" servisi de migration'ları bu aşamanın imajıyla çalıştırır.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

# Prisma sorgu motoru Alpine (musl) üzerinde OpenSSL'e ihtiyaç duyar.
RUN apk add --no-cache openssl

# package-lock.json npm 10.9 ile oluşturuldu; imajdaki npm 10.8 yerine aynı
# sürüm kullanılır, böylece "npm ci" kilit dosyasıyla birebir aynı kurulumu yapar.
RUN npm install -g npm@10.9.0

WORKDIR /app

# Önce yalnızca bağımlılık tanımları ve Prisma şeması kopyalanır; kaynak kod
# değiştiğinde bağımlılık katmanı önbellekten kullanılır.
# (npm ci, postinstall adımında "prisma generate" çalıştırır.)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Production imajı için geliştirme bağımlılıkları ayrı bir kopyada kaldırılır.
# Üretilmiş Prisma Client (node_modules/.prisma) korunur.
RUN cp -R node_modules /tmp/node_modules \
  && cd /tmp \
  && cp /app/package.json /app/package-lock.json ./ \
  && npm prune --omit=dev --ignore-scripts

# ---------------------------------------------------------------------------
# production: yalnızca derlenmiş kod ve production bağımlılıkları.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /tmp/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# Uygulama root olmayan kullanıcıyla çalışır.
USER node

EXPOSE 3001

# Healthcheck docker-compose.yml içinde tanımlıdır.
CMD ["node", "dist/main"]
