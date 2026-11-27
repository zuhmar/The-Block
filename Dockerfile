FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-data/package.json packages/game-data/package.json
COPY packages/art-tools/package.json packages/art-tools/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY apps/server/src apps/server/src
COPY packages/shared packages/shared
COPY packages/game-data packages/game-data
COPY prisma prisma
# The authority reuses pure FPS layout, collision, inventory and combat modules.
# No client art or models are needed to run these modules on the server.
COPY apps/client/src/fps/*.ts apps/client/src/fps/*.json apps/client/src/fps/
COPY apps/client/src/fps/models/apartment-props/catalog.json apps/client/src/fps/models/apartment-props/catalog.json
COPY apps/client/src/fps/models/block-mart/meshy/layout.json apps/client/src/fps/models/block-mart/meshy/layout.json
COPY apps/client/src/fps/models/timber-yard/colliders.json apps/client/src/fps/models/timber-yard/colliders.json
COPY apps/client/src/fps/models/timber-yard/catalog.json apps/client/src/fps/models/timber-yard/catalog.json
EXPOSE 2567
CMD ["pnpm", "--filter", "@street/server", "start"]
