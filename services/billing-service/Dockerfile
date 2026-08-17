# Build context: repo root (docker build -f services/billing-service/Dockerfile .)
# Uses Turborepo's prune to ship only this service + the workspace deps it
# actually needs — a plain "npm install" from inside services/billing-service can't
# resolve sibling "@pospe/*": "*" packages, there's nothing by that name on
# the public registry.
FROM node:20-alpine AS base
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @pospe/billing-service --docker

FROM node:20-alpine AS installer
# Prisma's query-engine binary needs libssl, which node:20-alpine doesn't
# ship — without it, "prisma generate" mis-detects the engine variant and
# the app crashes at startup trying to dlopen a missing libssl.so.
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=base /app/out/json/ .
RUN npm install
COPY --from=base /app/out/full/ .
COPY --from=base /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=base /app/scripts/docker-fix-package-mains.js ./scripts/docker-fix-package-mains.js
# The Prisma schema lives in the database package, which this service
# doesn't depend on as a workspace package (only @prisma/client, the
# generated-client consumer) — turbo prune doesn't pull it in, so it's
# copied in directly just for `prisma generate`.
COPY --from=base /app/database/prisma ./database/prisma
RUN npx prisma generate --schema database/prisma/schema.prisma
RUN npx turbo run build --filter=@pospe/billing-service
RUN node scripts/docker-fix-package-mains.js

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app .
EXPOSE 4002
CMD ["node", "services/billing-service/dist/index.js"]
