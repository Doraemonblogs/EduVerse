# EduVerse 数艺学院官网

数字艺术职业教育品牌官网：Next.js 16 + Payload CMS 3 + PostgreSQL。前台简体中文，后台 `/admin`（中文界面）。

> 项目文档：[需求](docs/PRD.md) · [架构](docs/ARCHITECTURE.md) · [进度](docs/PROGRESS.md) · [开发约定](CLAUDE.md)
> 完整的部署说明在 M8 补充。

## 本地开发

环境要求：Node.js 22 LTS（≥ 22.23.5）、pnpm 10、PostgreSQL 16（或 Docker）。

```bash
cp .env.example .env            # 然后修改 PAYLOAD_SECRET
docker compose -f docker-compose.dev.yml up -d   # 启动 PostgreSQL（含测试库 eduverse_test）
pnpm install
pnpm dev                        # http://localhost:3000
```

写入演示数据（专业方向、课程、作品、讲师、文章等，均为虚构；约 45 秒）：

```bash
pnpm seed:reset
```

演示账号（仅限本地开发，种子脚本结束时也会打印）：

| 角色             | 邮箱                             | 密码                     |
| ---------------- | -------------------------------- | ------------------------ |
| 管理员           | admin@seed.eduverse.test         | EduVerse-Admin-2026      |
| 内容编辑         | editor@seed.eduverse.test        | EduVerse-Editor-2026     |
| 课程顾问（北京） | consultant.bj@seed.eduverse.test | EduVerse-Consultant-2026 |
| 课程顾问（上海） | consultant.sh@seed.eduverse.test | EduVerse-Consultant-2026 |

不写演示数据时，首次打开 http://localhost:3000/admin 会引导创建第一个管理员账号。
设计规范页：http://localhost:3000/styleguide（仅开发环境）。

## 常用命令

| 命令                                   | 说明                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                             | 开发服务器                                                                    |
| `pnpm build` / `pnpm start`            | 生产构建 / 启动                                                               |
| `pnpm check`                           | 类型检查 + lint + 格式检查 + 单元与集成测试                                   |
| `pnpm test:e2e`                        | 端到端测试（先 `pnpm build`；首次需 `pnpm exec playwright install chromium`） |
| `pnpm seed:reset`                      | 一键重置演示数据（生产环境拒绝运行）                                          |
| `pnpm generate:types`                  | 生成 Payload 类型                                                             |
| `pnpm migrate:create` / `pnpm migrate` | 创建 / 执行数据库迁移                                                         |

## 环境变量

| 变量                      | 说明                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`            | PostgreSQL 连接串                                            |
| `TEST_DATABASE_URL`       | 集成测试库（可选，默认在 `DATABASE_URL` 的库名后加 `_test`） |
| `PAYLOAD_SECRET`          | Payload 加密密钥，至少 32 位随机字符串                       |
| `NEXT_PUBLIC_SITE_URL`    | 站点对外地址，用于 canonical / sitemap / OG                  |
| `ENABLE_STYLEGUIDE`       | 生产环境是否开放 `/styleguide`，默认 `false`                 |
| `MEDIA_DIR`               | 媒体文件目录，默认 `<项目根>/media`                          |
| `SEED_ADMIN_PASSWORD`     | 种子管理员密码（可选）                                       |
| `NEXT_TELEMETRY_DISABLED` | 设为 `1` 关闭 Next.js 遥测                                   |

## 在线预览站（GitHub Pages）

地址：**https://doraemonblogs.github.io/EduVerse/**

- 推送到默认分支后，GitHub Actions（`.github/workflows/preview-pages.yml`）自动构建并发布，约 3–5 分钟生效；也可在 Actions 页手动运行「预览站（GitHub Pages）」。
- 首次使用需要仓库管理员开启一次：**Settings → Pages → Build and deployment → Source 选择「GitHub Actions」**。
- 预览站是前台页面的静态快照：所有页面 `noindex`，表单提交与后台（`/admin`）不可用，页顶有提示条。
- 原理：以 `NEXT_BASE_PATH=/EduVerse` 构建并启动生产服务 → `scripts/preview/export-static.ts` 抓取页面 HTML、复制 `.next/static` → 校验无断链后发布。

本地生成并查看同样的预览站：

```bash
pnpm preview:build
NEXT_BASE_PATH=/EduVerse ENABLE_STYLEGUIDE=true pnpm start --port 3000
pnpm preview:export --origin http://localhost:3000 --base-path /EduVerse   # 另开终端
pnpm preview:serve                                                       # http://localhost:4173/EduVerse/
```

注意：`pnpm preview:build` 会覆盖 `.next`，之后跑端到端测试前需重新 `pnpm build`。
