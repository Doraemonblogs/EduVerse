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

首次打开 http://localhost:3000/admin 会引导创建第一个管理员账号。
设计规范页：http://localhost:3000/styleguide（仅开发环境）。

## 常用命令

| 命令                                   | 说明                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                             | 开发服务器                                                                    |
| `pnpm build` / `pnpm start`            | 生产构建 / 启动                                                               |
| `pnpm check`                           | 类型检查 + lint + 格式检查 + 单元与集成测试                                   |
| `pnpm test:e2e`                        | 端到端测试（先 `pnpm build`；首次需 `pnpm exec playwright install chromium`） |
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
| `NEXT_TELEMETRY_DISABLED` | 设为 `1` 关闭 Next.js 遥测                                   |
