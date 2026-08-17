# Build context: repo root (docker build -f services/synchronization-service/Dockerfile .)
# Uses Turborepo's prune to ship only this service + the workspace deps it
# actually needs — a plain "npm install" from inside services/synchronization-service can't
# resolve sibling "@pospe/*": "*" packages, there's nothing by that name on
# the public registry.
FROM node:20-alpine AS base
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @pospe/synchronization-service --docker

FROM node:20-alpine AS installer
WORKDIR /app
COPY --from=base /app/out/json/ .
RUN npm install
COPY --from=base /app/out/full/ .
COPY --from=base /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=base /app/scripts/docker-fix-package-mains.js ./scripts/docker-fix-package-mains.js
RUN npx turbo run build --filter=@pospe/synchronization-service
RUN node scripts/docker-fix-package-mains.js

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app .
EXPOSE 4010
CMD ["node", "services/synchronization-service/dist/index.js"]
