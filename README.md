# EduVerse 数艺学院官网

数字艺术职业教育品牌官网：Next.js 16 + Payload CMS 3 + PostgreSQL。前台简体中文，后台 `/admin`（中文界面）。

> 项目文档：[需求](docs/PRD.md) · [架构](docs/ARCHITECTURE.md) · [进度](docs/PROGRESS.md) · [开发约定](CLAUDE.md)
> 上线部署见下文 [生产部署](#生产部署)（Docker Compose + nginx）与 [运维](#运维)（备份、恢复、升级、回滚）。

## 功能概览

| 区域       | 路由                                                                     | 说明                                                                                     |
| ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 首页       | `/`                                                                      | 轮播、快速入口、热门专业、精选课程、作品、学员故事、合作企业、讲师、校区、资讯、预约试听 |
| 课程       | `/courses`、`/courses/[slug]`、`/majors/[slug]`                          | 筛选（URL 同步）、分阶段大纲、开班计划、薪资参考（注明来源）、专业方向落地页             |
| 作品与师资 | `/works`、`/works/[id]`、`/teachers`、`/teachers/[slug]`                 | 瀑布流、灯箱、点击后加载的视频、讲师简介与授课课程                                       |
| 资讯与校区 | `/articles`（含分类、详情）、`/campuses`、`/campuses/[slug]`、`/careers` | 阅读量、地图外链、照片、近期开班、就业服务                                               |
| 获客工具   | `/quiz`、`/tutorials`、`/search`                                         | 职业测试（留资看完整报告）、免费教程（部分留资解锁）、站内搜索                           |
| 通用页面   | `/about`、`/contact`、`/privacy`、`/terms`                               | 后台「页面」集合，区块化编辑                                                             |
| 留资       | 全站                                                                     | 弹窗 / 页内 / 侧栏三种表单，防刷、来源追踪、群机器人推送、后台跟进与导出                 |
| SEO        | `/sitemap.xml`、`/robots.txt`                                            | 每页 TDK 可在后台配置，结构化数据，筛选组合页不收录                                      |

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

| 变量                      | 说明                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL 连接串                                                                                                                                                                                              |
| `TEST_DATABASE_URL`       | 集成测试库（可选，默认在 `DATABASE_URL` 的库名后加 `_test`）                                                                                                                                                   |
| `PAYLOAD_SECRET`          | Payload 加密密钥，至少 32 位随机字符串                                                                                                                                                                         |
| `NEXT_PUBLIC_SITE_URL`    | 站点对外地址，用于 canonical / sitemap / OG                                                                                                                                                                    |
| `TRUST_PROXY`             | 在单层可信反向代理（nginx）之后设为 `true`，按 `X-Forwarded-For` 最后一个地址限频；nginx 需设置 `X-Forwarded-For $proxy_add_x_forwarded_for` 与 `X-Real-IP $remote_addr`（见 ARCHITECTURE §4.9）。默认 `false` |
| `ENABLE_STYLEGUIDE`       | 生产环境是否开放 `/styleguide`，默认 `false`                                                                                                                                                                   |
| `MEDIA_DIR`               | 媒体文件目录，默认 `<项目根>/media`                                                                                                                                                                            |
| `SEED_ADMIN_PASSWORD`     | 种子管理员密码（可选）                                                                                                                                                                                         |
| `NEXT_TELEMETRY_DISABLED` | 设为 `1` 关闭 Next.js 遥测                                                                                                                                                                                     |

## 在线预览站（GitHub Pages）

地址：**https://doraemonblogs.github.io/EduVerse/**

- 推送到默认分支后，GitHub Actions（`.github/workflows/preview-pages.yml`）自动构建并发布，约 3–5 分钟生效；也可在 Actions 页手动运行「预览站（GitHub Pages）」。
- 首次使用需要仓库管理员开启一次：**Settings → Pages → Build and deployment → Source 选择「GitHub Actions」**。
- 预览站是前台页面的静态快照：所有页面 `noindex`，表单提交与后台（`/admin`）不可用，页顶有提示条。
- 原理：以 `NEXT_BASE_PATH=/EduVerse` 构建并启动生产服务 → `scripts/preview/export-static.ts` 抓取页面 HTML、复制 `.next/static` → 校验无断链后发布。

本地生成并查看同样的预览站（站点地址要包含子路径，否则 sitemap 与 canonical 校验会失败）：

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000/EduVerse pnpm preview:build
NEXT_BASE_PATH=/EduVerse NEXT_PUBLIC_STATIC_PREVIEW=true ENABLE_STYLEGUIDE=true pnpm start --port 3000
pnpm preview:export --origin http://localhost:3000 --base-path /EduVerse   # 另开终端
pnpm preview:serve                                                       # http://localhost:4173/EduVerse/
```

注意：`pnpm preview:build` 会覆盖 `.next`，之后跑端到端测试前需重新 `pnpm build`。

## 后台使用要点

- **三种角色**：管理员（全部权限，含账号与站点设置）、内容编辑（内容与页面设置，看不到线索）、课程顾问（只看到“线索”，且只能看、改分配给自己的线索）。
- **内容发布**：课程、专业方向、讲师、作品、学员故事、文章、校区、教程、页面都有草稿；只有“发布”后前台才可见，保存后前台缓存自动失效。作品与学员故事发布前必须勾选“已取得学员书面授权”。
- **页面设置**：首页区块、各列表页的标题 / 简介 / SEO、详情页行动号召文案在“站点配置”分组的全局配置中（首页、课程 / 作品 / 师资 / 资讯 / 校区 / 教程页面设置、就业服务页、职业测试设置）。
- **线索**：列表按状态、顾问、意向、时间筛选；状态按“新线索 → 已联系 → 已到访 → 已报名 / 无效”流转（顾问只能向前），跟进记录自动记录作者与时间；同一手机号 30 天内再次提交标记为重复并交给原顾问。右上角菜单“导出 CSV”按当前筛选导出（每次导出记入操作日志）。
- **群机器人**：在“留资设置”中添加企业微信 / 飞书 / 钉钉机器人地址（只接受官方域名，可加签、默认手机号脱敏），新线索自动推送，失败自动重试。
- **合规**：文案避免绝对化用语与效果承诺；薪资参考必须填写来源与统计时间（前台固定附免责声明）；学员一律使用化名；隐私政策与用户协议需在上线前于后台「页面」中创建并发布（演示数据里的草稿可作起点），并经法务审核。

## 测试

| 命令                          | 内容                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm test:unit`              | 单元测试（纯函数、组件渲染、种子数据与广告法用语检查），不需要数据库                 |
| `pnpm test` / `pnpm check`    | 单元 + 集成测试（集成测试连接 `eduverse_test` 库：权限、防篡改、草稿过滤、留资流程） |
| `pnpm build && pnpm test:e2e` | 端到端测试（桌面 1440 / 手机 390，生产构建，3100 端口），含无障碍（axe）与 SEO 审计  |

端到端测试会提交演示线索并在结束时删除；会提交线索的测试文件登记在 `tests/helpers/lead-identity.ts`。

## 目录结构

```
src/app/(frontend)/   前台页面            src/app/(payload)/   Payload 后台（生成，勿改）
src/collections/      内容集合            src/globals/         全局配置
src/components/       组件（ui / common / layout / lead / course / works / home …）
src/lib/data/         数据查询（带缓存标签）  src/lib/<领域>/   纯函数与类型
src/i18n/zh.ts        系统文案            src/styles/globals.css  设计令牌
scripts/seed/         演示数据            scripts/preview/     静态预览站导出
deploy/               生产部署（entrypoint、nginx 示例、备份）  tests/  unit / int / e2e
```

## 生产部署

单台服务器 + Docker Compose（PRD Q5，无 Redis）。结构：

```
访客 ──HTTPS──▶ nginx（宿主机：证书、gzip、限速、真实 IP）
                  │ 127.0.0.1:3000
                  ▼
               app 容器（Next.js + Payload，同一进程；非 root 运行）── media 卷（上传的图片 / 视频）
                  │ compose 内部网络
                  ▼
               db 容器（PostgreSQL 16，不映射宿主机端口）── pgdata 卷
```

| 文件                              | 作用                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `Dockerfile`                      | 多阶段构建（依赖 → 编译 → 运行），Node 22，pnpm（corepack），非 root，带 HEALTHCHECK   |
| `docker-compose.yml`              | `app` + `db`，健康检查、数据卷、日志轮转；配置全部来自 `deploy/.env.production`        |
| `deploy/.env.production.example`  | 生产配置示例：每个变量的含义、默认值、是否必填（复制为 `deploy/.env.production` 填写） |
| `deploy/docker-entrypoint.sh`     | 容器入口：数据库迁移 → 预渲染页面 → 启动服务                                           |
| `deploy/nginx.conf.example`       | 反向代理示例：HTTPS、`X-Forwarded-For`、上传上限、静态缓存、gzip、限速                 |
| `deploy/backup.sh` / `restore.sh` | 备份（数据库 + 媒体，保留 7 天）与恢复                                                 |

### 服务器准备

- Linux x86_64 / arm64，建议 2 核 4GB 内存、40GB 磁盘起步（构建镜像时 `next build` 需要 2–3GB 内存；内存不够时可在另一台机器构建后 `docker save` / `docker load` 传过来）。
- Docker Engine 24+ 与 Compose v2.24+（`docker compose version`）、nginx 1.18+、git。
- **备案**：服务器在中国大陆时，域名必须完成 ICP 备案才能开放 80 / 443 端口；上线后在后台「站点设置 → 备案信息」填写 ICP 备案号（页脚展示），开通 30 天内办理公安联网备案并填写公安备案号。
- 防火墙只开放 22、80、443；app（3000）只监听 127.0.0.1，数据库不对外。

### 首次部署

```bash
git clone <仓库地址> /srv/eduverse && cd /srv/eduverse

# 1. 生产配置（含密钥，只允许部署用户读取；已被 git 忽略）
cp deploy/.env.production.example deploy/.env.production
chmod 600 deploy/.env.production
#   必填：NEXT_PUBLIC_SITE_URL（如 https://www.example.com）
#        PAYLOAD_SECRET   ← openssl rand -hex 32
#        POSTGRES_PASSWORD ← openssl rand -hex 24
#   国内服务器：NODE_IMAGE / POSTGRES_IMAGE 改为可用的镜像源，NPM_REGISTRY=https://registry.npmmirror.com/
#   公司网络对 HTTPS 做中间人代理（下载依赖报 SELF_SIGNED_CERT_IN_CHAIN）：BUILD_EXTRA_CA_FILE=<根证书文件>

# 2. 之后的 docker compose 命令都读取这份配置（也可以每次加 --env-file deploy/.env.production）
export COMPOSE_ENV_FILES=deploy/.env.production

# 3. 构建并启动（首次构建约 3–5 分钟）
docker compose build
docker compose up -d
docker compose ps                 # app、db 均为 healthy
docker compose logs -f app        # 依次看到：执行数据库迁移… → 预渲染页面… → 启动服务
curl -fsS http://127.0.0.1:3000/api/health   # {"status":"ok"}
```

漏掉 `--env-file` / `COMPOSE_ENV_FILES` 时 compose 会直接报“缺少 POSTGRES_PASSWORD”并停止，不会用默认值启动。
`deploy/.env.production` 放在 `deploy/` 而不是项目根目录，是为了不被本地 `pnpm build` / `pnpm start` 自动加载。

### 反向代理与 HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/conf.d/eduverse.conf
# 把文件中所有 www.example.com / example.com（含 server_name 与 return 301 的跳转目标）换成自己的域名，改证书路径；
# 证书可用云厂商免费证书或 certbot / acme.sh（首次申请时证书文件还不存在，nginx -t 会失败：先用 standalone 方式申请，或暂时只启用 80 端口的 server）
sudo nginx -t && sudo systemctl reload nginx
```

- **真实 IP**：`TRUST_PROXY=true`（默认）时，app 取 `X-Forwarded-For` 的**最后一个**地址识别访客（留资、阅读量按 IP 限频）。示例配置已设置 `X-Forwarded-For $proxy_add_x_forwarded_for` 与 `X-Real-IP $remote_addr`。前面还有 CDN / 负载均衡时，先按示例中的注释启用 `set_real_ip_from` + `real_ip_header`，否则所有访客会被识别成 CDN 节点。**不经过 nginx、直接对外暴露 app 端口时必须改为 `TRUST_PROXY=false`**，否则访客可伪造请求头绕过限频。
- **限速**（超出返回 429，阈值按“挡脚本、不挡共用出口 IP 的人”设置，可按访问量调整）：前台页面每 IP 每秒 20 个（突发 100，含客户端导航与预取）、`/search` 每秒 3 个、`/api/articles/<id>/view` 每秒 2 个、后台登录每分钟 10 次；其余 `/api/`（Payload REST：已发布内容匿名可读；GraphQL 已关闭）与 `/_next/image` 各自每秒 20 个、突发 200（后台编辑并发请求多，阈值放宽）。`/admin` 页面不限速。
- **上传**：`client_max_body_size 51m`（后台单个文件上限 50MB，另留表单开销）。
- **缓存**：`/_next/static`（带哈希，一年 immutable）与 `/_next/image`（按格式区分 AVIF / WebP）由 nginx 再缓存一份；媒体文件 `/api/media/file/*` 浏览器缓存 1 天（文件名不含内容哈希，替换同名文件最迟 1 天生效），错误响应不缓存。前台页面 `Cache-Control: private, no-cache, no-transform`（百度不转码；不进共享缓存，浏览器每次确认），页面缓存在 app 内部完成（ISR）。
- `/api/health` 只允许本机访问；监控请在服务器本机探测 `http://127.0.0.1:3000/api/health`。
- 开启 HTTPS 后示例配置会发送 HSTS（一年）。证书续期失败会导致站点无法访问，务必配置自动续期。

### 首次创建管理员

库里还没有账号时，任何人调用创建接口都能注册成管理员，所以示例 nginx 配置**一律屏蔽** `/api/users/first-register`，第一个账号不能通过域名创建。
站点启动后，在自己的电脑上建立 SSH 隧道直接访问服务器本机的 app（app 端口只绑定 127.0.0.1）：

```bash
ssh -N -L 3000:127.0.0.1:3000 <用户>@<服务器>
```

再在本机浏览器打开 http://localhost:3000/admin ，按提示创建第一个账号（库里第一个账号自动成为管理员）。之后从 `https://<域名>/admin` 正常登录，
在「后台用户」中为编辑、课程顾问建号。nginx 的这条屏蔽规则保留即可（已有账号后接口本身也会拒绝）。

**对外开放前必须创建并发布的页面**（后台「页面」，slug 固定）：

| slug      | 用途                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| `privacy` | 隐私政策。**每个留资表单的同意项都链接到 `/privacy`**，未发布时该链接 404    |
| `terms`   | 用户协议                                                                     |
| `about`   | 关于我们（导航、页脚的链接在后台「导航」「页脚」中配置，通常会链接到这三页） |
| `contact` | 联系我们                                                                     |

文案可参考演示数据的草稿（`scripts/seed/data/pages.ts`），隐私政策与用户协议须经法务审核；发布隐私政策后在「站点设置」中填写对应的隐私政策版本号（随每条线索记录）。
生产环境不会写入演示数据（种子脚本拒绝在生产环境运行），也没有演示账号：列表页先显示空状态，上面四个页面在发布前返回 404，在后台录入内容并发布后出现。

> 未配置邮件服务：忘记密码的重置邮件只会写到容器日志（`docker compose logs app`），由管理员在「后台用户」里直接修改密码即可。

### 数据库迁移

- 容器每次启动先执行 `payload migrate`（`src/migrations/` 中尚未执行的迁移），**失败则不启动服务**，日志里有原因。
- 查看状态：`docker compose run --rm app migrate:status`；只执行迁移：`docker compose run --rm app migrate`。
- 需要单独执行迁移时可在配置中设 `RUN_MIGRATIONS=false`。
- **不要在生产环境执行 `migrate:down`**：M2 迁移的回滚语句无法执行（见 `docs/PROGRESS.md` M2「已知问题」）。回滚一律用“升级前的备份 + 旧镜像”，见 [运维 · 回滚](#回滚)。

### 构建与渲染方式

- 镜像构建时**不连接数据库**：`next build --experimental-build-mode=compile` 只编译不预渲染，同一个镜像可以用在任何数据库上。
- 容器启动时连上数据库再预渲染（`--experimental-build-mode=generate`）：首页、课程 / 专业 / 作品 / 讲师 / 资讯 / 校区详情等生成静态页，之后按 ISR 定时或后台保存时更新，与 `pnpm build` 的行为一致。内容越多启动越慢（几秒到一两分钟，期间 nginx 返回 502）。预渲染失败只告警并退回按需渲染；`PRERENDER_ON_START=false` 则全部页面在访问时渲染（启动最快，每次访问多耗一些 CPU）。
- 每次启动从镜像里的干净产物开始（丢弃上次运行的页面与数据缓存）：缓存标签的失效记录只在进程内存里，沿用旧的磁盘缓存可能读到后台早已修改的内容。
- 缓存有上限：内存 LRU 64MB；优化后图片的磁盘缓存 500MB；按 slug / ID 的详情缓存只接受已发布清单中的值（随机路径直接 404，不进数据缓存，slug 超过 80 个字符直接 404）；随机路径渲染出的 404 页面只放内存、不写入 `.next/server/route-cache`（`cache-handler.mjs`），磁盘上的页面缓存以已发布内容的数量为上限。
- `NEXT_PUBLIC_SITE_URL` 在构建时写入产物，**换域名需要重新构建镜像**（`docker compose build`）。
- 镜像约 1.8GB（运行时需要完整的生产依赖来执行 `payload migrate`，没有使用 standalone 输出）。

## 运维

以下命令都在项目目录执行，并已 `export COMPOSE_ENV_FILES=deploy/.env.production`（或给每条命令加 `--env-file deploy/.env.production`）。

| 操作        | 命令                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| 状态        | `docker compose ps`（`healthy` 为正常）                                                  |
| 日志        | `docker compose logs -f --tail=200 app`（每个容器最多保留 5 × 10MB）                     |
| 重启        | `docker compose restart app`（会重新执行迁移检查与预渲染）                               |
| 停止 / 启动 | `docker compose stop` / `docker compose up -d`                                           |
| 进入容器    | `docker compose exec app sh`；数据库：`docker compose exec db psql -U eduverse eduverse` |
| 健康检查    | `curl -fsS http://127.0.0.1:3000/api/health`                                             |

### 备份

```bash
deploy/backup.sh     # 数据库（pg_dump 自定义格式）+ 媒体文件（tar.gz），校验后写入 BACKUP_DIR，删除 7 天前的备份
```

- 只支持 compose 内的 `db` 服务：配置了 `DATABASE_URL`（外部数据库）时备份 / 恢复脚本拒绝执行，外部数据库请用其自身的备份方案（如云数据库快照）。
- 备份目录 `BACKUP_DIR` 默认 `/var/backups/eduverse`（权限 700），保留天数 `BACKUP_KEEP_DAYS` 默认 7，都在 `deploy/.env.production` 中设置；不要放在项目目录里（`git clean` 会删掉）。
- 每天定时（root 的 crontab）：`17 3 * * * /srv/eduverse/deploy/backup.sh >> /var/log/eduverse-backup.log 2>&1`
- 备份含线索手机号等个人信息：只在本机保留 7 天不等于安全，建议加密后同步到另一台机器或对象存储（异地备份），并定期做一次恢复演练。

### 恢复

```bash
sudo deploy/restore.sh /var/backups/eduverse/eduverse-<时间>-db.dump \
                       /var/backups/eduverse/eduverse-<时间>-media.tar.gz --yes
```

脚本依次：完整读一遍备份（损坏或不完整时停止，现有数据不动）→ 恢复到临时库 `<库名>_restore`（站点照常运行；失败时删除临时库，现有数据不动）→
停止 app → 现有数据库改名保留为 `<库名>_before_restore`、临时库改为正式库名 → 清空并解压 media 卷 → 启动 app（入口脚本补执行缺少的迁移）。
不带 `--yes` 只打印将要做的事；省略媒体文件时只恢复数据库。备份目录权限为 700（root 的定时任务创建），非 root 用户需要 `sudo`。
恢复期间磁盘上同时有两份数据库；确认站点正常后按脚本最后打印的命令删除 `<库名>_before_restore`（下一次恢复也会先删掉它）。

手动恢复（脚本不可用时；会直接覆盖现有数据库，先 `deploy/backup.sh` 留底）：

```bash
docker compose stop app
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' < <db.dump>
docker compose run --rm --no-deps -T --entrypoint sh app -c 'find /app/media -mindepth 1 -delete && tar -C /app -xzf -' < <media.tar.gz>
docker compose up -d app
```

### 升级

```bash
cd /srv/eduverse
deploy/backup.sh                                          # 1. 先备份（回滚靠它）
docker tag eduverse-app:latest eduverse-app:prev          # 2. 给当前镜像留个标签
git pull                                                  # 3. 更新代码（先看 docs/PROGRESS.md 是否有新的配置项）
docker compose build app                                  # 4. 构建新镜像（旧容器继续服务）
docker compose up -d app                                  # 5. 替换容器：迁移 → 预渲染 → 启动
docker compose ps && docker compose logs --tail=100 app   # 6. 确认 healthy、页面与后台正常
```

替换容器期间（通常几十秒）nginx 返回 502。新镜像会让升级前打开、尚未提交的留资表单失效（Server Action 随构建变化），访客刷新页面即可。
`deploy/.env.production.example` 新增变量时，对照着补到 `deploy/.env.production`。PostgreSQL 不要跨大版本直接换镜像（16 → 17 需要 `pg_dump` 导出再导入新库）。

**升级 Next.js / Payload 版本时**（开发者在合入前做）：本项目依赖两处 Next 内部实现——`cache-handler.mjs`（继承内部的文件缓存、给每路径时效表设上限）与镜像使用的实验性构建模式 `--experimental-build-mode=compile / generate`。
先跑 `pnpm test:unit tests/unit/cache-handler.test.ts`，再在测试机上用空库起一套（`docker compose -p eduverse-try --env-file <测试配置> up -d --build`，`APP_PORT` 不要用 3000），
确认日志出现“预渲染完成”、各页面返回 200 / 404，并请求几百个随机地址（如 `/courses/x<随机数>`）后 `docker compose -p eduverse-try exec app sh -c 'find .next/server/route-cache -type f | wc -l'` 不增长；
最后 `docker compose -p eduverse-try --env-file <测试配置> down -v` 清理（**带上 `-p eduverse-try`**，不要在生产目录里对默认项目执行 `down -v`，会删除生产数据卷）。

### 回滚

数据库迁移不做 `migrate:down`（M2 迁移无法回滚）。新版本有问题时，恢复升级前的数据并**用旧镜像**启动：

```bash
sudo deploy/restore.sh --app-image=eduverse-app:prev \
                       /var/backups/eduverse/eduverse-<升级前>-db.dump \
                       /var/backups/eduverse/eduverse-<升级前>-media.tar.gz --yes
```

**必须用 `--app-image` 指定旧镜像**：脚本最后会启动 app，入口脚本随即执行迁移——如果这时启动的还是新镜像，
新版本的迁移会再次写进刚恢复的数据库，旧镜像就无法使用这份数据了。（也可以用环境变量 `APP_IMAGE`，但 `sudo` 默认会丢掉环境变量，所以回滚用参数。）

确认无误后执行 `docker tag eduverse-app:prev eduverse-app:latest`，并把代码切回对应版本，避免下次 `docker compose build` 又构建出新版本。
`deploy/.env.production` 里的 `APP_IMAGE` 保持 `eduverse-app:latest`，**不要改成 `eduverse-app:prev`**：升级第 2 步会覆盖 prev 标签，
`docker compose build` 也会把新镜像写进 `APP_IMAGE` 指定的标签，最后一个可用的旧镜像就没有标签了。
注意：恢复会丢失升级之后产生的线索与内容修改，回滚前可先导出线索（后台「线索 → 导出」）。

### 媒体存储

上传文件保存在 `media` 数据卷（随 `deploy/backup.sh` 备份）。以后需要切换到对象存储（阿里云 OSS / 腾讯云 COS 等 S3 兼容服务）时，
加入 `@payloadcms/storage-s3` 插件并按环境变量为媒体集合启用，迁移已有文件，再调整 nginx 的 `/api/media/file/` 与备份脚本的媒体部分
（步骤见 `docs/ARCHITECTURE.md` §10）。

### 安全检查清单

- `deploy/.env.production` 权限 600、不提交；`PAYLOAD_SECRET` 上线后不要更换（所有账号需要重新登录）。
- 数据库只在 compose 内部网络；app 只监听 127.0.0.1；`TRUST_PROXY` 与部署方式一致（见上文）。
- 后台账号：离职人员在「后台用户」中停用；顾问只看得到分配给自己的线索。
- 定期 `apt upgrade`（宿主机、nginx）与升级本项目镜像（基础镜像的安全更新随重新构建生效）。
