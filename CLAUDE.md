# CLAUDE.md

「EduVerse 数艺学院」官网：数字艺术职业教育品牌站（参考 hxsd.com 的信息架构，**素材与文案全部原创**）。
界面语言：简体中文。面向中国大陆用户。

- 需求：`docs/PRD.md`（含已确认决策 Q1–Q5）
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
pnpm build && pnpm start # 生产构建与启动
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
pnpm preview:build       # 以 /EduVerse 子路径构建静态预览站（会覆盖 .next）
pnpm preview:export      # 抓取运行中的预览服务，导出到 preview-dist/
pnpm preview:serve       # 本地模拟 GitHub Pages 查看 preview-dist/
```

在线预览站：https://doraemonblogs.github.io/EduVerse/（推送默认分支后由 `.github/workflows/preview-pages.yml` 自动发布，详见 README）。
新增页面若不能从首页顺着链接到达，需登记到 `scripts/preview/export-static.ts` 的 `ENTRY_PATHS`。

本地数据库：`docker compose -f docker-compose.dev.yml up -d`（会同时创建 `eduverse_test`）。
无 Docker 时自行安装 PostgreSQL 16，创建 `eduverse` 与 `eduverse_test` 两个库。
集成测试自动把 `DATABASE_URL` 的库名加 `_test` 后缀（或使用 `TEST_DATABASE_URL`），不会碰开发数据。

## 目录约定

```
src/
  app/(frontend)/   前台路由（独立根布局，引入 globals.css）
  app/(payload)/    Payload 生成的后台与 REST/GraphQL 路由，不要手改
  app/global-not-found.tsx  未匹配任何路由时的 404
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
scripts/     种子数据与占位图脚本（M1 起）
docs/        PRD、架构、进度
```

## 编码规范

- TypeScript strict，禁止 `any`、`@ts-ignore`；类型导入用 `import { type X }`。
- 默认写服务端组件；只有需要交互时才加 `'use client'`，并尽量把客户端边界压到最小。
- 数据访问集中在 `src/lib/data/*`（Payload Local API + 缓存标签）；页面与组件不直接拼查询。
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

- **不得访问、抓取 hxsd.com**，不得复制其文案、图片、课程、作品；参考只用产品方提供的截图。
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
