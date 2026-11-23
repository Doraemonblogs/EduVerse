# EduVerse 生产镜像：Next.js 16 + Payload 3（同一进程），单机 docker compose 部署（PRD Q5）。
# 用法与参数说明见 README「生产部署」；一般通过 docker compose 构建：
#   docker compose --env-file deploy/.env.production build
#
# 构建参数：
#   NODE_IMAGE            基础镜像，默认官方 node:22-bookworm-slim（glibc，sharp 预编译包可直接使用）；
#                         国内可改为镜像源，如 --build-arg NODE_IMAGE=<镜像源>/library/node:22-bookworm-slim
#   NPM_REGISTRY          npm 源（pnpm 与 corepack 共用），默认官方；国内可用 https://registry.npmmirror.com/
#   NEXT_PUBLIC_SITE_URL  站点对外地址（必填，如 https://www.example.com）。NEXT_PUBLIC_* 在构建时写入产物，
#                         换域名需要重新构建镜像
# 可选构建密钥：
#   --secret id=extra_ca,src=<证书文件>   公司网络做 TLS 中间人代理时，下载依赖需要信任的额外根证书
#                                         （只在下载步骤挂载，不进入镜像）
#
# 构建时不连接数据库：next build 以 compile 模式只编译、不预渲染，镜像因此与数据库内容无关。
# 容器启动时（deploy/docker-entrypoint.sh）：数据库迁移 → 用连上数据库的 generate 模式预渲染页面（与 pnpm build
# 的静态页 / ISR 行为一致；失败时退回按需渲染）→ 启动服务。

ARG NODE_IMAGE=node:22-bookworm-slim

# ───────────── base：Node + pnpm（corepack，版本取 package.json 的 packageManager） ─────────────
FROM ${NODE_IMAGE} AS base
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_NPM_REGISTRY=${NPM_REGISTRY} \
    npm_config_registry=${NPM_REGISTRY} \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json ./
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
    && corepack enable \
    && corepack install \
    && pnpm --version

# ───────────── deps：全部依赖（构建用） ─────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=eduverse-pnpm-store,target=/pnpm/store,sharing=locked \
    --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
    && pnpm install --frozen-lockfile --store-dir /pnpm/store

# ───────────── prod-deps：只含生产依赖（运行镜像用；payload migrate 所需的 tsx 由 payload 自带） ─────────────
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=eduverse-pnpm-store,target=/pnpm/store,sharing=locked \
    --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
    && pnpm install --frozen-lockfile --prod --store-dir /pnpm/store

# ───────────── builder：编译 Next.js（compile 模式，不需要数据库） ─────────────
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL
ENV NODE_ENV=production \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN case "$NEXT_PUBLIC_SITE_URL" in \
      http://*|https://*) ;; \
      *) echo "缺少构建参数 NEXT_PUBLIC_SITE_URL（站点对外地址，如 https://www.example.com）" >&2; exit 1 ;; \
    esac \
    && pnpm build --experimental-build-mode=compile \
    && rm -rf .next/cache

# ───────────── runner：运行镜像（非 root） ─────────────
FROM ${NODE_IMAGE} AS runner
ARG NEXT_PUBLIC_SITE_URL
ENV NODE_ENV=production \
    NODE_OPTIONS=--no-deprecation \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    PORT=3000 \
    MEDIA_DIR=/app/media
WORKDIR /app

# 依赖、源码（payload migrate 需要加载 payload.config.ts、集合定义与迁移文件）、配置（含 next.config.ts 引用的
# cache-handler.mjs：运行时直接加载，不经过编译）与编译产物只读（属主 root）；
# 编译产物放在 .next-build，每次启动复制到 .next（运行用户可写：预渲染页面、ISR 与数据缓存），
# 重启后从干净的产物开始——数据缓存的失效记录只保存在内存里，沿用上次的磁盘缓存可能读到过期内容。
# media（上传文件）挂载卷。
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json next.config.ts cache-handler.mjs tsconfig.json ./
COPY src ./src
COPY --from=builder /app/.next ./.next-build
COPY --chmod=755 deploy/docker-entrypoint.sh /usr/local/bin/eduverse-entrypoint
RUN mkdir -p /app/.next /app/media && chown node:node /app/.next /app/media

USER node
EXPOSE 3000
VOLUME ["/app/media"]

# 健康检查：/api/health 会查询一次数据库（见 src/app/api/health/route.ts）。
# 启动期（迁移 + 预渲染）可能需要一两分钟，期间的失败不计入
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

ENTRYPOINT ["eduverse-entrypoint"]
CMD ["start"]
