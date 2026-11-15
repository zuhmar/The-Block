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
COPY . .
EXPOSE 2567
CMD ["pnpm", "--filter", "@street/server", "start"]
