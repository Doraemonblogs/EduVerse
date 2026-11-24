# CLAUDE.md

「EduVerse 数艺学院」官网：数字艺术职业教育品牌站（参考 hxsd.com 的信息架构、m.itheima.com 的版式与交互，**素材与文案全部原创**）。
界面语言：简体中文。面向中国大陆用户。

- 需求：`docs/PRD.md`（含已确认决策 Q1–Q6）
- 参考站版式分析：`docs/REFERENCE-LAYOUT.md`（M2 全站框架、M5 首页依据）
- 架构与数据模型：`docs/ARCHITECTURE.md`
- 进度与关键决策：`docs/PROGRESS.md`（每个里程碑结束时更新）

## 技术栈

| 层          | 选型                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| 框架        | Next.js 16.4（App Router、Turbopack、React 19）+ TypeScript strict                       |
| CMS         | Payload 3.94（与 Next 同进程，后台 `/admin`，中文界面）+ PostgreSQL 16                   |
| 样式        | Tailwind CSS v4（令牌在 `src/styles/globals.css`）+ shadcn/ui（Radix，代码已拷入并改造） |
| 校验 / 测试 | zod · Vitest（unit + int 两个 project）· Playwright（desktop 1440 / mobile 390）         |
| 包管理      | pnpm 10，Node 22 LTS（≥ 22.23.5；engines 同时允许 24.22.3+ / 26.13.1+）                  |

## 常用命令

```bash
pnpm dev                 # 开发服务器 http://localhost:3000（后台 /admin，设计规范 /styleguide）
pnpm build && pnpm start # 生产构建与启动（构建前自动清除 .next 中的 Next 数据缓存）
pnpm typecheck           # next typegen + tsc --noEmit
pnpm lint                # ESLint，0 warning 才算通过
pnpm format              # Prettier 格式化（format:check 只检查）
pnpm test                # Vitest：unit + int（int 需要 PostgreSQL 与 eduverse_test 库）
pnpm test:unit           # 只跑单元测试（无需数据库）
pnpm test:e2e            # Playwright，默认对 3100 端口的生产构建运行（先 pnpm build）
pnpm check               # typecheck + lint + format:check + test
pnpm generate:types      # 改了集合 / 全局配置后重新生成 src/payload-types.ts
pnpm generate:importmap  # 新增后台自定义组件后重新生成 importMap
pnpm migrate:create      # 数据模型变更后创建迁移（每个改动 schema 的里程碑结束时必须做）
pnpm migrate             # 执行迁移
pnpm seed:reset          # 一键重置种子数据（清空内容 / 线索 / 种子账号，重新生成占位图与演示内容，约 45 秒；会清除 Next 数据缓存，运行中的服务需重启）
pnpm preview:build       # 以 /EduVerse 子路径构建静态预览站（会覆盖 .next；本地需 NEXT_PUBLIC_SITE_URL=http://localhost:3000/EduVerse，见 README）
pnpm preview:export      # 抓取运行中的预览服务，导出到 preview-dist/
pnpm preview:serve       # 本地模拟 GitHub Pages 查看 preview-dist/
```

生产部署（详见 README「生产部署」「运维」）：

```bash
docker compose --env-file deploy/.env.production up -d --build   # 构建并启动 app + postgres（启动时自动迁移、预渲染）
deploy/backup.sh                                                   # 备份数据库与媒体（保留 7 天）
deploy/restore.sh                                                  # 恢复（需 --yes；回滚前先 export APP_IMAGE=<旧镜像>）
```

在线预览站：https://doraemonblogs.github.io/EduVerse/（推送默认分支后由 `.github/workflows/preview-pages.yml` 自动发布，详见 README）。
新增页面若既不能从首页顺着链接到达、也不在 sitemap 中，需登记到 `scripts/preview/export-static.ts` 的 `ENTRY_PATHS`。
新增可收录的页面类型时，同步加入 `src/lib/data/sitemap.ts`（过滤条件与详情页一致），并加入 `tests/e2e/a11y.e2e.spec.ts` 的页面清单；SEO 审计（`tests/e2e/seo.e2e.spec.ts`）会要求 sitemap 与可收录页面双向一致。
新增顶层前台路由（`/courses`、`/works` …）时，同步登记到 `src/lib/reserved-slugs.ts`（通用页面 `/[pageSlug]` 不得占用）；导航已链接、尚未实现的路由登记在导出脚本的 `PLANNED_ROUTES`，实现后删除。`/api/health` 是健康检查路由，不得新建同名 Payload 集合或端点。
按访客可控的参数（slug、ID、查询词）缓存的查询：slug 不超过 80 个字符（`src/lib/slug-rules.ts`），详情先经 `loadIfKnown()`（`src/lib/data/known-key.ts`）按已发布清单判断，不存在的值不进持久缓存；查询词类不进持久缓存。
根目录 `cache-handler.mjs` 是生产运行时文件（404 页面只放内存，并给 Next 的每路径时效表设上限），继承 Next 内部模块：升级 Next 时先跑 `tests/unit/cache-handler.test.ts`，Dockerfile 会复制它，移动或删除时同步改 `next.config.ts`。
GraphQL 已关闭（`payload.config.ts` 的 `graphQL.disable`）：前台用 Local API、后台用 REST；重新开启前先解决 `loginUser` 绕过登录限速的问题。
站点地图与 robots 在 `src/app/sitemap.ts`、`src/app/robots.ts`（Next 约定放在 `src/app` 根目录，不在 `(frontend)` 下）；内置默认分享图由 `pnpm exec tsx scripts/seo/generate-default-share-image.ts` 按设计令牌生成。
新增有前台详情页的集合时，在 `src/components/common/rich-text.tsx` 登记其路径前缀（富文本链接与页面缓存标签依赖它）。
数据层返回给前台的富文本（专业介绍、页面区块，及以后的讲师简介、文章正文等）先经 `guardCourseLinks()`（`src/lib/data/courses.ts`）处理，指向已下线课程的链接只保留文字。
会提交线索的 e2e 测试文件登记到 `tests/helpers/lead-identity.ts` 的 `LEAD_SPECS`，用其中的函数生成模拟 IP 与手机号（单元测试兜底）。

本地数据库：`docker compose -f docker-compose.dev.yml up -d`（会同时创建 `eduverse_test`）。
无 Docker 时自行安装 PostgreSQL 16，创建 `eduverse` 与 `eduverse_test` 两个库。
集成测试自动把 `DATABASE_URL` 的库名加 `_test` 后缀（或使用 `TEST_DATABASE_URL`），不会碰开发数据。

## 目录约定

```
src/
  app/(frontend)/   前台路由（独立根布局，引入 globals.css）
  app/(payload)/    Payload 生成的后台与 REST/GraphQL 路由，不要手改
  app/global-not-found.tsx  未匹配任何路由时的 404
  app/sitemap.ts app/robots.ts app/api/health/   站点地图、robots、健康检查
  collections/ globals/ fields/ access/ hooks/   Payload 配置（按领域拆文件）
  components/ui/       shadcn 原子组件（已按设计令牌改造）
  components/common/   版式组件：Container、Section、SectionHeading、StatusPage …
  components/<领域>/   业务组件：layout / lead / course / works …
  lib/                 纯函数与服务端工具（data/ 数据查询、validation/ zod、seo/ …）
  i18n/zh.ts           系统级文案（校验错误、分页、空状态、无障碍提示）
  styles/globals.css   设计令牌（唯一来源）；contrast-pairs.ts 登记需校验的对比度组合
  fonts/               自托管字体（仅拉丁子集，附 OFL 许可证）
  config/site.ts       兜底配置与部署相关配置（站点 URL）
tests/unit/  tests/int/  tests/e2e/（fixtures.ts 自动断言控制台无报错）
scripts/seed/  种子数据：registry（slug 骨架）、data/（内容）、placeholders（占位图）、index（runSeed）
scripts/preview/  静态预览站导出
Dockerfile docker-compose.yml deploy/  生产镜像、编排、nginx 示例、备份 / 恢复脚本、生产配置示例
docs/        PRD、架构、进度
```

## 编码规范

- Next.js 16 与训练数据中的旧版本差异很大：写 Next 相关代码前先查 `node_modules/next/dist/docs/` 中对应版本的文档，留意弃用提示；Payload 以 `node_modules/payload/dist` 的类型定义为准。

- TypeScript strict，禁止 `any`、`@ts-ignore`；类型导入用 `import { type X }`。
- 默认写服务端组件；只有需要交互时才加 `'use client'`，并尽量把客户端边界压到最小。
- 数据访问集中在 `src/lib/data/*`（Payload Local API + 缓存标签）；页面与组件不直接拼查询。
  Local API 默认 `overrideAccess: true`：前台查询带草稿的集合时**必须**过滤 `_status: { equals: 'published' }`，并且不要把线索、用户等数据暴露给前台。
- 后台媒体 URL、手写站内链接用 `withBasePath()`（`src/lib/base-path.ts`）补子路径。
- 新增集合 / 字段：在 `src/collections` 或 `src/globals` 定义 → 注册到 `payload.config.ts` → `pnpm generate:types` → 必要时 `pnpm generate:importmap` → `pnpm migrate:create`。
- 种子数据通过 `scripts/seed/registry.ts` 的 slug 互相引用；新增内容类型时同步扩展种子脚本与 `tests/unit/seed-data.test.ts`。
- 所有外部输入（表单、查询参数、webhook 配置）用 zod 校验；服务端必须再校验一遍。
- 样式只用语义令牌类：`bg-background` `text-foreground` `text-muted-foreground` `bg-primary` `text-emphasis` `border-border` 等；
  不写十六进制色值，不用 Tailwind 默认色板（`gray-500`、`blue-600` …）。
- 区块用 `<Section tone="light|paper|dark">` + `<Container>`；深色区块内组件会自动切换配色。
- 合并 className 用 `cn()`；在 `globals.css` 新增字号 / 间距令牌时，同步登记到 `src/lib/utils.ts` 的 tailwind-merge 配置（有测试兜底）。
- 新增语义颜色组合时登记到 `src/styles/contrast-pairs.ts`，单元测试会校验 WCAG AA。
- 品牌橙（`bg-primary`）只用于 CTA，文字必须是近黑（`text-primary-foreground`）；白字放在品牌橙上不达标。
- 无障碍：语义化标签、每个表单控件都有 `<Label>`、错误信息用 `aria-describedby` 关联、图片必须有 alt、图标按钮必须有 `aria-label`。
- 中文文案不使用绝对化用语（最好 / 第一 / 顶级 / 唯一 …），不做效果承诺（包就业 / 保证高薪 …）。
- 每个页面导出 `generateMetadata`（或 `metadata`），TDK 来自 CMS，兜底读 `src/config/site.ts`。
- 测试命名用中文描述行为；e2e 用例从 `tests/e2e/fixtures.ts` 导入 `test`。
- 提交信息：`<类型>(<范围>): <中文摘要>`，如 `feat(lead): 留资表单支持弹窗形态`。

## 禁止事项

- **不得访问 hxsd.com；不得抓取、复制 hxsd.com 与 itheima.com 的品牌、配色、文案、图片、课程、作品与数据**。hxsd 只借鉴信息架构；itheima 只借鉴版式与交互，结论见 `docs/REFERENCE-LAYOUT.md`（该站只对手机浏览器提供页面，产品方要求时可用手机浏览器配置查看，只看不存）。
- 不得引入 Google Fonts / Google Analytics / reCAPTCHA / 任何境外 CDN 等大陆无法稳定访问的服务；不外链第三方图片。
- 不得在组件中硬编码营销文案、导航、图片（来自 CMS；系统提示语进 `i18n/zh.ts`）。
- 不得随意新增依赖；确需新增时在 `docs/PROGRESS.md` 记录理由。
- 不得手改 `src/app/(payload)/**`、`src/payload-types.ts`、`src/migrations/**`（用命令生成）。
- 不得提交 `.env`、密钥、`media/` 上传目录、`preview-dist/` 导出目录。
- 站内链接一律用 `next/link`（会自动带上 basePath）；不要手写以 `/` 开头的 `<a href>` / `<img src>`。`next/image` 只有静态导入的图片会带 basePath，字符串 `src`（如后台媒体 URL）不会，需经 basePath 工具函数处理（M1 提供）。预览站导出会把缺少 basePath 的引用报为错误。
- 不得在前台暴露线索数据；线索 REST 写入只能走服务端 Action，不开放公开 create。
- 不得为了通过检查而跳过 / 删除测试、降低 lint 规则或加 `eslint-disable`（确有必要时写明原因）。
- 已交付的功能不留 TODO 占位；空状态、加载态、错误态都要处理。

## 工作流程

一次只做一个里程碑（见 `docs/PRD.md` §9）。里程碑结束前必须：

1. `pnpm check` 与 `pnpm build` 通过；`pnpm test:e2e` 通过（控制台无报错）。
2. 用 1440px 与 390px 截图自查（无横向滚动）。
3. 改了数据模型则 `pnpm migrate:create` 并提交迁移。
4. 更新 `docs/PROGRESS.md`，git 提交，汇报后停下等待确认。
