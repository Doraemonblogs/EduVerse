# 架构设计

> 与 `docs/PRD.md` 配套；版式参考见 `docs/REFERENCE-LAYOUT.md`。数据模型在 M1 落地时如有调整，同步更新本文件并在 `docs/PROGRESS.md` 记录原因。

## 1. 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| 框架 | Next.js 16.4（App Router、Turbopack、React 19）+ TypeScript strict | 服务端渲染对百度友好；Payload 3.94 支持 Next ≥ 16.4.5 |
| CMS | Payload 3.94（`create-payload-app` blank 模板）+ `@payloadcms/db-postgres` | 后台、权限、媒体库、富文本（Lexical）、版本草稿、任务队列均内置；后台中文（`@payloadcms/translations/languages/zh`） |
| 数据库 | PostgreSQL 16 | 开发期 push 自动同步表结构；生产只跑迁移（`prodMigrations` 启动时执行） |
| 样式 | Tailwind CSS v4 + shadcn/ui（Radix） | 令牌集中在 `globals.css`；shadcn 代码拷入项目可深度改造，避免模板感 |
| 校验 | zod 4 | 前后端共用 schema |
| 表单 | 原生 form + Server Action + `useActionState` | 字段少，不引入 react-hook-form；无 JS 也能提交 |
| 测试 | Vitest（unit / int）+ Playwright（desktop 1440 / mobile 390） | int 使用独立测试库 `eduverse_test` |
| 字体 | 中文系统字体栈；拉丁展示字体 Space Grotesk 自托管（OFL，22KB） | 不依赖 Google Fonts，中文零下载 |
| 部署 | 多阶段 Dockerfile（`next start`）+ docker-compose（app + postgres）+ 宿主机 nginx 反向代理，媒体存本地卷；见 §10 | 不用 standalone：容器启动时要执行 `payload migrate`，需要完整生产依赖；无 Redis（单机，PRD Q5） |
| 预览站 | GitHub Pages 静态快照（GitHub Actions 构建 → 抓取 → 发布） | 只读预览，便于评审；见 §9 |

### 依赖清单与理由

| 依赖 | 引入时间 | 理由 |
|---|---|---|
| next / react / payload / @payloadcms/* / sharp / graphql | M0 脚手架 | 官方脚手架生成，版本由 create-payload-app 对齐 |
| @payloadcms/translations | M0 | 后台中文界面（需显式依赖才能在 pnpm 严格模式下导入） |
| tailwindcss / @tailwindcss/postcss / postcss | M0 | 样式系统 |
| radix-ui / class-variance-authority / clsx / tailwind-merge / lucide-react | M0 | shadcn/ui 组件的运行时依赖；lucide 只用于功能性图标 |
| pinyin-pro | M1（计划） | 文章标题自动生成拼音 slug，仅服务端 |
| tw-animate-css | M2（计划） | shadcn Dialog / Sheet 的进出场动画 |
| axe-core（devDependency，精确版本 4.14.1） | M8 | e2e 无障碍检查：`tests/helpers/axe.ts` 把 axe 注入页面运行 WCAG 2 A / AA 规则；原本只是 eslint-plugin-jsx-a11y 的传递依赖（pnpm 不提升，不能直接引用）；不引入 `@axe-core/playwright`，少一层封装；只用于测试，不进入产品 |
| @payloadcms/storage-s3 | 未引入（M8 决定） | 媒体先存本地卷（PRD §2）；切换对象存储时再加这个插件，步骤见 §10 |

刻意不引入：轮播库（CSS scroll-snap + 小 hook）、瀑布流库（已知宽高比 + 最短列算法）、灯箱库（Radix Dialog）、react-hook-form、任何统计 / 客服 SDK。

## 2. 架构要点

### 2.1 渲染与缓存
- 页面默认是服务端组件，通过 Payload Local API 直接查库，不走 HTTP。
- 数据查询集中在 `src/lib/data/*`，每个查询带缓存标签（如 `courses`、`course:<slug>`、`global:site-settings`）。
- Payload 集合 / 全局配置的 `afterChange` / `afterDelete` 钩子调用 `revalidateTag(tag, 'max')`，后台发布即生效。
- 筛选页（`/courses`、`/works`）按 searchParams 动态渲染，底层查询仍走缓存。
- 阅读量等高频写入使用原生 SQL 自增，**绕过 Payload 钩子**，避免触发缓存失效与版本记录。
- **缓存有界**（M8）：访客能控制的缓存键都有上限，随机地址刷请求不会让磁盘无限增长：
  - slug 最长 80 个字符（`MAX_SLUG_LENGTH`，`src/lib/slug-rules.ts`），不合法直接 404；
  - 详情查询先查“已发布 slug / ID 清单”缓存，不在清单中的直接返回 null，不进入按 slug 的缓存（`src/lib/data/known-key.ts` 的 `loadIfKnown`）；
  - 搜索结果不进持久缓存（M7）；
  - Next 16.4 把渲染好的页面存到 `.next/server/route-cache/`，其中包括每个随机地址的 404 页面（约 25KB / 个，不会删除）。根目录 `cache-handler.mjs` 继承 Next 内置的文件缓存，只改一处：状态码 404 的页面只放内存（`cacheMaxMemorySize` 64MB，LRU）、不写盘；只在生产环境启用。它依赖 Next 内部模块 `next/dist/server/lib/incremental-cache/file-system-cache.js`，**升级 Next 时必须复查**（`tests/unit/cache-handler.test.ts` 用真实实现兜底）；
  - 图片优化缓存上限 500MB（`images.maximumDiskCacheSize`）。
- **响应头**（`next.config.ts`）：前台页面统一 `Cache-Control: private, no-cache, no-transform`（覆盖 Next 默认值：发布后立即可见、CDN 不缓存个性化内容；`no-transform` 防止百度转码），另加 `X-Accel-Buffering: no`（nginx 不缓冲流式渲染）；5xx 仍为 `no-store`。媒体文件 `/api/media/file/*` 为 `public, max-age=86400, stale-while-revalidate=604800`：文件名含尺寸但不含内容哈希，后台替换文件后可能沿用同一地址，不能用 immutable 长缓存。
- **revalidateTag 只在内存中**：Next 的标签失效记录不落盘，重启后磁盘上的旧缓存会被当作有效。生产容器每次启动都从镜像内干净的构建产物重置 `.next`，再连上数据库预渲染（见 §10）。

### 2.2 留资链路
1. `SourceTracker`（客户端）首次落地时把 UTM、referrer、落地页写入 sessionStorage（首次触达归因）。
2. 任意 CTA 调用 `openLead({ position, intent, disciplineId, courseId })` 打开弹窗，或页内 / 侧栏表单直接提交。
3. Server Action `submitLead` 依次：zod 校验 → honeypot（命中则伪装成功）→ 最短填写时间（客户端测得的停留时长 < 2s 视为机器）→ 进程内突发限流 → 数据库限频（同 IP 10 分钟 / 24 小时、同手机号 24 小时，阈值后台可配）→ 重复判定（30 天内同手机号：标记重复、关联原线索；原顾问仍在职才沿用分配）→ `payload.create({ overrideAccess: true })`。详见 §4.9。
4. 写入后把 webhook 推送放入 Payload 任务队列（最多重试 5 次，指数退避约 1 / 2 / 4 / 8 / 16 分钟；结果记在线索上）。
5. 返回成功状态：展示微信二维码与引导语；前端 `_hmt.push(['_trackEvent', ...])` 记录百度统计转化。
6. `leads` 集合的公开 REST create 关闭（`access.create` 仅管理员）。

### 2.3 角色与权限

| 角色 | 内容集合 | 媒体 | 站点设置 | 留资设置 | 线索 | 用户 |
|---|---|---|---|---|---|---|
| 管理员 admin | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 |
| 内容编辑 editor | 增删改 | 增删改 | 可改；脚本类字段不可见 | 无 | **无**（个人信息最小化） | 仅自己 |
| 课程顾问 consultant | 无 | 无 | 无 | 无 | 仅 `assignedTo = 自己`；可改状态、加跟进；不可改分配人 / 来源 / 同意记录；可导出自己的线索 | 仅自己 |

后台登录：`maxLoginAttempts: 5`、`lockTime: 10 分钟`。

## 3. 目录结构

```
src/
  app/
    (frontend)/            前台：独立根布局，引入 Tailwind
      layout.tsx page.tsx not-found.tsx error.tsx
      courses/ majors/ works/ careers/ teachers/ campuses/
      articles/ tutorials/ quiz/ search/ [pageSlug]/   # about / contact / privacy / terms
      styleguide/          设计规范（开发工具，生产默认 404）
    (payload)/             Payload 生成的 admin 与 /api
    api/health/route.ts    健康检查（Payload 初始化 + select 1，3 秒超时）
    sitemap.ts robots.ts   元数据路由放在 src/app 根目录（Next 16 约定）
    global-not-found.tsx
  collections/ globals/ fields/(seo, slug, consent) access/ hooks/
  components/ ui/ common/ layout/ lead/ course/ works/ home/ article/ quiz/ styleguide/
  lib/ data/ validation/ lead/(rate-limit, webhook, csv) seo/ a11y/ utils.ts
  i18n/zh.ts  styles/globals.css  styles/contrast-pairs.ts  fonts/  config/site.ts
  payload.config.ts  payload-types.ts  migrations/
scripts/seed/ (index.ts, data/*.ts, placeholders.ts)  scripts/preview/  scripts/seo/（默认分享图生成）
tests/unit/ tests/int/ tests/e2e/ tests/helpers/
docs/  docker/（开发库初始化）  docker-compose.dev.yml
Dockerfile  .dockerignore  docker-compose.yml  cache-handler.mjs
deploy/（docker-entrypoint.sh、nginx.conf.example、backup.sh、restore.sh、.env.production.example）
```

## 4. 数据模型

记号：→ 关联（relationship）；⇠ join 字段（反向关联，自动计算，不双向维护）。
以下所有内容类型都带 `seo` 组（title / description / keywords / ogImage / noindex）与草稿 / 发布状态。

### 4.1 系统
- **users**：email、name、role（admin / editor / consultant）、phone、→campus（顾问所属校区）、active。
- **media**：alt（必填）、caption；预设尺寸 thumb 400、card 800、hero 1920、og 1200×630；允许 mp4（≤ 50MB）。
- **audit-logs**：action（export_leads …）、→user、count、filters（JSON）、createdAt。

### 4.2 专业与课程
- **disciplines** 专业方向：name、slug、tagline、intro（富文本）、cover、careerDirections[] { title, description }、salaryRef { range, source, statDate, note }、showInNav、order；⇠courses ⇠works ⇠teachers。
- **courses** 课程：title、slug、→discipline、classType（long_term / short_term）、deliveryModes[]（offline / online / dual）、→campuses[]、duration { value, unit }、schedule、summary、cover、audience[]、highlights[]、stages[] { title, duration, goals, topics[] }、→software[]、projects[] { title, description, image }、→teachers[]、careerDirections[]、salaryRef（空则继承专业方向）、→faqs[]、featured、order；⇠cohorts ⇠works。
- **cohorts** 开班计划：→course、→campus（线上可空）、mode、startDate、endDate、status（enrolling / upcoming / full / closed）、note。不做“剩余名额”类紧迫感营销。
- **software**：name、slug、category、order（只用文字，不用厂商 Logo）。

### 4.3 信任背书
- **teachers**：name、slug、title、avatar、→disciplines[]、→campus、yearsOfExperience、specialties[]、bio（富文本）、experience[] { period, org（虚构）, role }、featured、order；⇠courses（来自 courses.teachers）。
- **works**：title、author { displayName（化名）, cohortLabel }、→discipline、→course、→software[]、cover（含宽高）、gallery[]、video { kind: embed / file, embedUrl, file }、description、featured、**consentConfirmed**（必勾才能发布）、publishedAt、order。
- **stories** 学员故事：displayName（化名）、avatar（可选）、background、→course、currentRole、companyName / →partner、story（富文本）、→works[]、**consentConfirmed**、featured。不展示个人薪资；受站点设置总开关控制。
- **partners**：name（虚构）、logo、industry、order。
- **career-events** 招聘活动：title、date、location、→campus、description、image。

### 4.4 内容与获客
- **articles**：title、slug（拼音自动生成，可改）、→category、cover、excerpt、content、authorName、publishedAt、views（只读）、→relatedCourses[]、searchText（隐藏，纯文本，供搜索）。
- **article-categories**：name、slug、description、order（学院新闻 / 行业资讯 / 学习干货 / 常见问题）。
- **campuses**：name、slug、city、citySlug、address、location { lng, lat }、transit、phone、openingHours、photos[]、order；⇠courses。
- **banners**：title、subtitle、image、mobileImage、link、ctaLabel、placement、startAt、endAt、order。
- **faqs**：question、answer、category。
- **tutorials**：title、→discipline、cover、provider（bilibili 等白名单）、videoId、duration、level、**gated**、description、order。
- **quiz-questions**：question、order、options[] { label, scores[] { →discipline, weight } }。
- **pages**：title、slug、blocks（RichText / ImageText / Stats / Timeline / CTA）。

### 4.5 线索 leads（核心）
- 基本：name、phone、→discipline（意向专业）、city、message。
- intent：trial（预约试听）/ tuition（咨询学费）/ materials（领取资料）/ quiz / tutorial / consult。
- 跟进：status（new → contacted → visited → enrolled / invalid）、→assignedTo、followUps[] { content, →author, createdAt }（作者与时间自动写入）、statusHistory[]（自动）。
- 来源 source：pageUrl、position、landingUrl、referrer、utmSource、utmMedium、utmCampaign、utmTerm、utmContent。
- 上下文 context：→course、quizResult（JSON）、tutorialId。
- 客户端 client：ip、userAgent。
- 同意 consent：agreed、policyVersion、agreedAt。
- 去重：isDuplicate、→duplicateOf。
- 推送：webhookDeliveries[] { target, status, attempts, lastError, at }。
- 索引：(phone, createdAt)、(ip, createdAt)、status、assignedTo。

### 4.6 全局配置
- **site-settings**：brandName、logo（深 / 浅）、hotline、wechatQr、wechatId、address、icp { number, link }、psb { number, code }、analytics { baiduTongjiId, baiduSiteVerification }、customerService { enabled, script }（仅管理员）、customHead（仅管理员）、defaultSeo、salaryDisclaimer、showStories、privacyPolicyVersion。
- **navigation**：items[] { label, type: link / courseMegaMenu, link }、ctaLabel。
- **footer**：columns[] { title, links[] }、qrcodes[] { label, image }、copyright。
- **home-page**：各区块 { enabled, eyebrow, title, description, 手选 / 自动内容 }。
- **course-pages**（课程页面设置，M3）：list { title, description, seo }、detail { sidebarTitle, sidebarDescription }、major { ctaTitle, ctaDescription }；默认文案在 `src/globals/course-pages-defaults.ts`，后台未保存过时前台用同一份默认值。
- **article-pages**（资讯页面设置，M6）：list { title, description, seo }、detail { sidebarTitle, sidebarDescription }；**campus-pages**（校区页面设置，M6）：list { title, description, seo }、detail { ctaTitle, ctaDescription }；**careers-page** 增加 cta { title, description }。
- **work-pages**（作品页面设置，M4）、**teacher-pages**（师资页面设置，M4）：list { title, description, seo }、detail { ctaTitle, ctaDescription }；默认文案分别在 `src/globals/{work,teacher}-pages-defaults.ts`。
- **careers-page**。
- **quiz-settings**（职业测试设置，M7 补齐）：intro { title, description, startLabel }、result { summaryTitle, gatedTitle, gatedDescription, unlockLabel, reportTitle, disclaimer, nextStepsTitle, nextSteps[] { title, description } }、seo；默认文案在 `src/globals/quiz-settings-defaults.ts`。结果页的完整报告（各方向得分、推荐课程、下一步建议）在留资后展开，是营销引导而非访问控制：数据本身不敏感，随页面一起下发。
- **tutorial-pages**（教程页面设置，M7）：list { title, description, seo }、gate { title, description, submitLabel }；默认文案在 `src/globals/tutorial-pages-defaults.ts`。“留资后解锁”（gated）同样是引导而非访问控制：视频在公开平台，播放器地址对所有教程都下发，解锁记录只存在访客浏览器（localStorage）。
- **lead-settings**：webhooks[] { name, platform: wecom / feishu / dingtalk, url（仅允许三家官方域名）, secret, enabled, maskPhone }、rateLimits、cityOptions[]、successMessage。

扩展预留：学员账号用新集合 `members`（与后台 `users` 分离），线索可关联；订单 / 课节作为新集合挂在课程下，不改现有字段。

### 4.7 M1 落地说明（与上文的差异与补充）

- **slug**：使用 Payload 内置 `slugField`，标题中的中文由 `pinyin-pro` 转为无声调拼音（`src/lib/slugify.ts`），后台可锁定 / 手改；统一校验 `^[a-z0-9]+(-[a-z0-9]+)*$`。作品详情用 `/works/[id]`，不设 slug。
- **草稿**：专业方向、课程、讲师、作品、学员故事、文章、校区、免费教程、页面启用草稿（`_status`）。**Local API 默认 `overrideAccess: true`，前台数据层必须显式过滤 `_status: published`**。
- **users**：新增 `active`（停用后 `beforeLogin` 拒绝登录）；库中没有账号时第一个账号自动成为管理员；`role`、`active` 仅管理员可改；非管理员只能读写自己的账号（不对其隐藏菜单，以免影响“我的账号”页）。
- **leads**：`beforeChange` 钩子在服务端重建状态变更历史（忽略提交值，防伪造），新增跟进记录自动写入记录人与时间、已有记录保留原作者；`source / context / consent / isDuplicate / duplicateOf / webhookDeliveries` 只读且仅管理员可写；`client`（IP、UA）与推送记录仅管理员可见。
- **cohorts**：标题由钩子按“课程 · 校区（或线上）· 开班日期（北京时间）”自动生成。
- **articles**：`searchText` 由钩子从标题、摘要、正文（Lexical 转纯文本，`src/lib/lexical-text.ts`）生成，供 M7 站内搜索。
- **works**：外部播放器地址只允许白名单域名（`ALLOWED_VIDEO_HOSTS`）；发布时必须勾选“已取得学员书面授权”（草稿不校验）。学员故事同理。
- **pages**：内容区块 `richText / imageText / stats / timeline / cta`（`src/blocks/`），数据区块要求注明口径与时间。
- **lead-settings**：群机器人地址的主机名必须与平台官方域名完全一致（`validateWebhookUrl`，防 SSRF）。
- **缓存标签**：`collection:<slug>`、`doc:<slug>:<id>`、`global:<slug>`（`src/hooks/revalidate.ts`）；脚本写入时传 `context.disableRevalidate`。
- **媒体**：本地目录默认 `<项目根>/media`（可用 `MEDIA_DIR` 覆盖），生成 thumbnail 400 / card 800 / hero 1920 / og 1200×630 的 WebP；字符串媒体 URL 在前台用 `withBasePath()`（`src/lib/base-path.ts`）补子路径。

### 4.8 种子数据

- `pnpm seed:reset`（`scripts/seed/index.ts`）：清空内容、线索与种子账号（`*@seed.eduverse.test`，不动其它账号）→ 本地生成占位图（`scripts/seed/placeholders.ts`，sharp 渲染 SVG，同一种子结果一致）→ 按依赖顺序写入 → 写全局配置 → 创建演示账号与线索。生产环境拒绝运行。
- 骨架 `scripts/seed/registry.ts` 定义专业方向 / 课程 / 软件 / 校区的 slug，其它数据通过类型化的 slug 引用（写错即编译失败）；内容在 `scripts/seed/data/`。
- `tests/unit/seed-data.test.ts` 校验数量、引用完整性与广告法禁用词。
- 演示账号（仅本地开发）：`admin@ / editor@ / consultant.bj@ / consultant.sh@seed.eduverse.test`，密码见种子脚本输出。

### 4.9 M2 落地说明（全站框架与留资）

- **框架** `src/components/layout/site-chrome.tsx`：头部（桌面横向导航 + Radix NavigationMenu 大菜单；移动端 Logo + 搜索 + 抽屉菜单，抽屉按专业方向分组列课程、城市校区、其它栏目、热线与预约）、页脚（深色转化区 + 品牌联系方式 + 链接栏 + 二维码 + 备案号）、桌面右侧悬浮栏（在线咨询 / 电话 / 微信 / 预约试听 / 返回顶部）、**移动端底部操作条**（电话 / 微信 / 在线咨询 / 预约试听，产品方 2026-11-23 确认）。前台布局与全局 404 共用。导航类链接 `prefetch={false}`。
- **数据层** `src/lib/data/site.ts`：`unstable_cache` + 与 Payload 钩子一致的标签；钩子用 `revalidateTag(tag, { expire: 0 })` 立即失效。`getLeadFormOptions` 只读取可公开字段，群机器人配置绝不下发前台；`getSiteSettings` 剔除第三方脚本字段。
- **留资**：`LeadForm`（dialog / inline / sidebar）+ `LeadDialogProvider`（全站唯一弹窗，`useLeadDialog().open({ position, intent, ... })`）+ `LeadCTA`。客户端与服务端共用 `src/lib/validation/lead.ts` 的 zod 规则；提交走 Server Action `submitLeadAction` → `submitLead`（`src/lib/lead/submit.ts`，可在集成测试中直接调用）：校验 → 蜜罐 → 最短填写时间 → 进程内突发限流 → 数据库限频（同 IP 10 分钟 / 24 小时、同手机号 24 小时，阈值后台可配）→ 重复判定（30 天内同手机号：标记重复、关联原线索；原顾问仍是在职顾问才沿用分配）→ 只接受已发布内容的关联 ID → 写入（记录同意时的隐私政策版本）→ 有启用的群机器人时排队任务。`submitLeadAction` 把任何异常（含读取请求头、初始化 Payload）都转成错误状态返回，不会 reject。
  - **手机号**：校验前去掉空格、连字符与 `+86` / `86` 前缀（`normalizePhone`），“138 0013 8000”“+86 13800138000”都按 `13800138000` 校验、入库；后台录入同样处理。
  - **自动采集字段**（来源页、落地页、referrer、UTM、按钮位置、测试结果）超长时截断，不拒绝提交；关联 ID 非法时视为未选择。访客填写的姓名、城市、留言仍按长度上限提示。
  - **最短填写时间**：客户端用 `performance.now()` 测得在表单上停留的毫秒数，放在隐藏字段 `fillMs`；服务端只在 `0 < fillMs < minFillSeconds × 1000` 时拒绝，`fillMs` 缺失或非法记为 0（未知）不拒绝。只比较一端的单调时钟，访客电脑时间不准不受影响。
  - **突发限流**：能识别 IP 时同一 IP 60 秒最多 3 次；识别不了（未设置 `TRUST_PROXY=true`）时改用全站共用的兜底计数，60 秒最多 20 次（正常流量碰不到，只挡脚本批量灌入），并在生产环境首次提交时打一条警告日志。手机号限频始终生效；同一手机号的“限频 / 查重 → 写入”在进程内串行执行（单实例部署，PRD Q5），并发提交不能同时绕过。
  - **重复线索的负责人**：只有原负责人仍是启用的课程顾问时才沿用；角色已变更或账号已停用时留空，交给管理员分配（仍标记重复、关联原线索）。
  - **客户端 IP**（`src/lib/lead/client-info.ts`）：只在 `TRUST_PROXY=true` 时读取转发头，且假定前面**只有一层**可信反向代理：取 `X-Forwarded-For` 的**最后一个**地址（代理追加的真实对端，前面的值客户端可以伪造），没有时退回 `X-Real-IP`；不是合法 IPv4 / IPv6 时记为 `unknown`。nginx 必须同时配置下面两行（只设 `X-Real-IP` 不够：Next.js 会在缺少 `X-Forwarded-For` 时用代理自己的地址补上，所有访客会变成同一个 IP）：

    ```nginx
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    ```

    前面还有 CDN 或多层代理时，要先在 nginx 用 `real_ip` 模块（`set_real_ip_from` + `real_ip_header`）还原真实访客地址，否则取到的是上一层代理的地址。
- **群机器人推送**：Payload 任务 `notifyLead`（`src/jobs/notify-lead.ts`，`src/lib/lead/webhook.ts`）。提交成功后用 `after()` 立即执行；失败按任务配置重试，每分钟的定时任务兜底；已推送成功的目标不重复推送；推送内容默认手机号脱敏，不含 IP / UA；发送前再次校验域名白名单。推送记录 `webhookDeliveries` 只能由任务（overrideAccess）写入，字段级 create / update 对所有人关闭，管理员在后台保存不会覆盖推送结果。群机器人最多 10 个（服务端同样校验）。
- **状态流转**：`src/lib/lead/status.ts`，课程顾问只能向前推进或标为无效，回退与重新激活只能由管理员操作（服务端钩子强制）。
- **导出**：`GET /api/leads/export`（`src/endpoints/export-leads.ts`）按后台列表当前筛选条件导出，访问控制保证顾问只导出自己的线索；UTF-8 BOM、防公式注入、不含 IP / UA；`where` 结构不合法返回 400；跨站顶层导航（`Sec-Fetch-Site: cross-site`）返回 403；单次最多 10000 条，超出时响应头 `X-Export-Truncated / X-Export-Count / X-Export-Total` 标明。每次导出写入 `audit-logs`（管理员只读），同时记录操作人关联与快照（邮箱、姓名、角色），删除账号后仍可追溯。入口在线索列表右上角菜单：按钮用 fetch 下载（进行中禁用、失败与截断用后台提示条告知），文件名取服务端 `Content-Disposition`。
- **任务队列**：REST 的 `/api/payload-jobs/run` 等只允许管理员；每分钟的定时运行顺带把卡在 `processing` 超过 10 分钟的任务放回队列（进程重启时被中断的推送不会永远卡住）。
- **通用页面** `/[pageSlug]`：渲染 `pages` 集合（关于、联系、隐私政策、用户协议）的内容区块；富文本组件处理站内链接与图片的 basePath；面包屑带 BreadcrumbList 结构化数据。原计划 M6 的“关于 / 联系”随通用页面路由在 M2 一并上线。
- **第三方脚本**：百度统计与在线客服只在后台配置后加载，`lazyOnload`；静态预览站不加载。
- **预览站**：导航已链接但尚未实现的路由登记在导出脚本的 `PLANNED_ROUTES`（标注里程碑），暂不算断链；实现后删除对应条目。

### 4.10 M3 落地说明（课程与专业方向）

- **数据层**：`src/lib/data/courses.ts` 同时导出 `query*(payload, …)`（集成测试直接调用）与带缓存的 `get*`（页面使用）；页面只拿 `src/lib/course/types.ts` 中可序列化的视图模型，不把 Payload 文档整个传给组件。纯函数（筛选、格式化、开班过滤、薪资取值、JSON-LD、文档映射）在 `src/lib/course/*`，无 `server-only`，有单元测试。
- **草稿与授权**：主查询只取已发布文档；depth 填充进来的专业方向、校区再按 `_status === 'published'` 过滤（从未发布过的草稿会被填充出来）；讲师与作品单独查询，作品额外要求 `consentConfirmed`。所属专业方向未发布的课程不出现在任何列表，详情 404。开班计划：已结束的不取；线下 / 双师开班的校区未发布或缺失时整条剔除。
- **时间**：缓存里保存全部未结束的开班，页面渲染时按北京时间当天 0 点过滤（`upcomingCohorts`）；详情页与专业页 `revalidate = 3600`，过期开班最迟一小时后消失。
- **缓存标签**：courses / disciplines / campuses / cohorts / teachers / software / faqs / works / media、`global:site-settings`（薪资免责声明、品牌名）、`global:course-pages`，专业介绍是富文本，另加富文本可链接集合的标签。
- **筛选** `/courses?discipline=&type=&mode=&city=`：每个维度单选，非法值忽略；筛选项都是 `next/link`（`rel="nofollow"`、不预取、不滚动），服务端渲染、无需 JS；有任一参数时 `noindex, follow`，canonical 恒为 `/courses`。城市取自课程开设校区。静态预览站无法按查询串筛选，筛选栏下方有说明。
- **页面级留资上下文**：`<PageLeadContext courseId disciplineId />`（`src/components/lead/page-lead-context.tsx`）挂载时登记、卸载时清除；`LeadDialogProvider.open()` 用它补全未显式传入的 courseId / disciplineId。因此课程页上的头部按钮、桌面悬浮栏、移动端底部操作条提交的线索都带课程上下文。
- **留资位置**：`course_card`、`course_list_empty`、`course_hero`（预约试听 / 咨询学费）、`course_sidebar`、`course_cohort`、`major_hero`（预约试听 / 领取学习资料）、`major_cta`。
- **结构化数据**：课程详情输出 Course（含每个近期开班的 CourseInstance：线下 Onsite / 线上 Online / 双师 Blended）、FAQPage、BreadcrumbList；专业页输出 BreadcrumbList 与课程 ItemList。
- **分享图**：视图模型带 `shareImage`（封面的 1200×630 裁切），`buildMetadata({ shareImage })` 直接使用；优先级：内容 SEO 分享图 → shareImage → 封面 → 站点默认。
- **富文本中的课程链接**：课程本身已发布但所属专业方向已下线时课程页 404。`guardCourseLinks()` 收集富文本里链接 / 关联到的课程，一次查询确认可访问，不可访问的只渲染文字；用于专业介绍与通用页面区块，以后渲染其它富文本时同样要经过它。
- **数据缓存与构建**：`unstable_cache` 持久化在 `.next/cache/fetch-cache`，键只由回调源码与 keyParts 决定，视图模型结构变化时键可能不变；`pnpm build` 开始前清除该目录（`scripts/clear-next-data-cache.mjs`），`pnpm seed:reset` 结束时同样清除。
- **桌面悬浮栏让位**：课程详情两栏区与页脚在 1024–1440px 之间用 `lg:avoid-floating-actions` 给右侧悬浮栏留出位置，避免盖住吸顶侧栏表单与页脚热线。
- **暂不链接**：校区详情（M6）尚未上线，课程与专业页中只展示、不加链接；作品与讲师自 M4 起链接到详情页。
- `/majors` 永久重定向到 `/courses`；`/courses`、`/majors` 已从预览站导出脚本的 `PLANNED_ROUTES` 移除。

### 4.11 M4 落地说明（学员作品与师资）

- **数据层**：`src/lib/data/{works,teachers}.ts`（query* / get* 分离），纯函数在 `src/lib/{works,teachers}/*`，通用分页 `src/lib/pagination.ts`、查询参数工具 `src/lib/search-params.ts`。作品一律要求已发布 + `consentConfirmed`（列表、详情、相关作品、讲师作品、富文本链接、结构化数据）；作品的所属课程只在课程及其专业方向都已发布时给出链接；讲师简介经 `guardCourseLinks()`。
- **外部视频**：播放器白名单在 `src/lib/works/video.ts`（https、白名单主机、无账号与端口），后台校验与前台渲染共用；前台为“点击后加载”：首屏只有封面与播放按钮，点击后才插入 iframe，访问页面时不请求第三方。
- **作品列表** `/works?discipline=&software=&featured=1&page=`：每页 24 件，CSS 多列瀑布流；有筛选参数时 `noindex, follow`、canonical `/works`；无筛选的第 N 页可收录、canonical `/works?page=N`、标题带“（第 N 页）”；页码超出范围 404。
- **作品详情** `/works/[id]`：深色媒体区（视频或大图 + 作品集缩略图）、可键盘操作的灯箱、作者化名说明、专业 / 课程链接、相关作品（同课程优先，最多 8）；结构化数据 CreativeWork（creator 为化名）+ BreadcrumbList。
- **师资** `/teachers?discipline=`（有筛选参数时 noindex）与 `/teachers/[slug]`（简介、从业经历、授课课程、学员作品、结尾留资）；结构化数据 Person + BreadcrumbList。校区暂不链接（M6）。
- **通用组件**：`FilterBar`（数据驱动的筛选栏，课程列表也改用它）、`Pagination`（可抓取的分页链接）、`WorkCard` / `WorkMasonry`；M3 的作品缩略图网格与讲师卡片网格整卡链接到详情。
- **留资位置**：`works_list_empty`、`work_detail`、`teacher_hero`、`teacher_cta`。
- **e2e**：fixtures 增加 `allowedThirdPartyHosts`（按用例声明，用于验证点击播放后才加载外部播放器，请求被拦截）。

### 4.12 M5 落地说明（首页）

- **数据**：`getHomePageData(now)`（`src/lib/data/home.ts`）一次返回各区块视图模型，关闭、无内容或（学员故事）总开关关闭的区块为 `null`，页面只渲染非空区块；取数规则在 `src/lib/home/rules.ts`（指定内容为空时：热门专业取导航中的专业，精选课程取各专业长期就业班，作品取精选，故事取精选且已授权，讲师取精选再按排序补足）。复用课程 / 作品 / 讲师的查询与映射，草稿、授权过滤与其它页面一致。
- **主视觉轮播**：缓存保存全部启用的首页轮播图，按投放时间窗在渲染时过滤；首页 `revalidate = 3600`。只有首张图立即加载并设 `fetchpriority=high`（不使用 `ReactDOM.preload`：预取首页时其提示会插入其它页面）；可暂停、上一张 / 下一张、圆点；悬停、键盘聚焦、页面隐藏或滚出视口时暂停；减少动态效果时默认不自动播放。只有 1 张时不渲染任何客户端脚本。
- **横滑容器** `HorizontalScroller`（`src/components/common/`）：CSS scroll-snap，移动端露出下一张；桌面可切换为网格；按钮与进度条是唯一的客户端部分；键盘聚焦的卡片自动滚入视口。
- **区块节奏**：深浅底色由页面统一决定（`src/components/home/rhythm.ts`）：作品与预约区为深色，其余区块浅色 / 米色交替，关闭区块后仍保持交替。
- **结构化数据**：Organization（上传了 Logo 才输出 logo）+ WebSite（SearchAction 指向 `/search?q=`，M7 实现）。
- **留资位置**：`home_hero`、`home_quick`、`home_course`、`home_form`。
- **首页全局**新增“精选课程”区块；默认文案在 `src/globals/home-page-defaults.ts`。

### 4.13 M6 落地说明（资讯、校区、就业服务）

- **数据层**：`src/lib/data/{articles,campuses,careers}.ts`（query* / get* 分离），纯函数在 `src/lib/{articles,campuses,careers}/*`。文章正文与学员故事正文经 `guardCourseLinks()`；相关课程只取可访问的课程；开班计划与招聘活动缓存全量、渲染时按北京时间过滤；资讯与就业服务缓存 1 小时。
- **阅读量**：`POST /api/articles/:id/view`（`src/endpoints/article-view.ts`）执行参数化的原生 SQL 自增（只对已发布文章），不触发钩子、不写版本、不改 updatedAt、不让缓存失效；同一 IP 同一文章 30 分钟只计一次（进程内），IP 未知时每篇每分钟最多计 60 次；页面显示的阅读量最迟 1 小时更新。详情页在客户端加载后上报一次（同一会话同一文章只报一次），静态预览站不上报。
- **路由**：`/articles`（分页可收录）、`/articles/category/[slug]`（分类落地页，可收录）、`/articles/[slug]`；`/campuses`、`/campuses/[slug]`；`/careers`。
- **通用组件**：灯箱提升为 `src/components/common/lightbox.tsx`（作品详情与校区照片共用）；`ArticleCard`、`CampusCard`、`StoryCard`、`PartnerWall` 从首页提取为通用组件。
- **校区链接**：课程详情首屏与侧栏、开班计划、讲师详情中的校区链接到校区详情（仅已发布校区）。
- **就业服务页**：不出现就业率、薪资承诺等字样（种子数据与 e2e 双重检查）；学员故事化名、无薪资，受总开关控制。
- **留资位置**：`article_sidebar`、`campus_hero`、`campus_cohort`（校区页开班计划行）、`campus_cta`、`careers_hero`、`careers_cta`。

### 4.14 M7 落地说明（职业测试、免费教程、站内搜索）

- **职业测试** `/quiz`：题目、选项加分、专业方向与课程卡片在服务端取（只取已发布专业），答题与计分在客户端（`src/lib/quiz/score.ts`：按专业累计、同分按专业排序）。结果摘要公开；完整报告在留资成功后（`LeadForm onSuccess`）展开，同一标签页内记住。线索意向 `quiz`、位置 `quiz_result`，`quizResult` 为 JSON（答案与各专业得分），服务端按结构校验后才保存。完整报告是营销引导而不是访问控制（数据不敏感）。
- **免费教程** `/tutorials?discipline=&level=&play=`：筛选组合与 `play` 深链接 `noindex`；播放弹窗使用通用 `VideoFacade`（点击后才加载哔哩哔哩播放器，域名白名单校验）；需留资的教程先显示表单（意向 `tutorial`、位置 `tutorial_gate`、`tutorialId`），提交成功后在本浏览器记住（localStorage，任一次成功即可解锁其它需留资的教程，避免重复留资触发限频）。留资解锁是引导而不是访问控制（视频本身在公开平台）。
- **站内搜索** `/search?q=`：`next/form`（自动补 basePath）GET 提交；课程、专业、资讯、讲师、作品（已授权）只搜已发布内容，数据库模糊匹配（LIKE 特殊字符按字面处理），每类最多 10 条；高亮用 `<mark>` 拆分渲染，不拼 HTML；有 q 时 `noindex, follow`、canonical `/search`。搜索结果不进入持久数据缓存（任意查询词会无限增加缓存文件），只在单次请求内去重。
- **通用**：`LeadForm` / `useLeadDialog().open()` 支持 `onSuccess`；`VideoFacade`（`src/components/common/video-facade.tsx`）供作品与教程共用；预览站导出的计划路由已清空。
- **留资位置**：`quiz_result`、`tutorial_gate`、`tutorials_list_empty`、`search_empty`。

### 4.15 M8 落地说明（SEO、性能、无障碍、部署）

- **sitemap.xml**（`src/app/sitemap.ts` + `src/lib/data/sitemap.ts`）：首页、列表页，以及与详情页同样过滤的已发布内容（课程要求专业方向已发布、作品要求已授权、资讯分类要求有已发布文章、通用页面不得占用保留路径），不含 noindex、筛选、搜索、`?page=N`、`/majors`、`/styleguide`。地址为绝对地址（含子路径），`lastModified` 取文档 `updatedAt`（列表页取设置与内容中最新的时间）。数据走缓存（9 个集合 + 9 个全局配置的标签），路由每小时刷新；超过 5 万条时截断并告警，切换到 `generateSitemaps` 分片的方法写在注释里。
- **robots.txt**（`src/lib/seo/robots.ts`）：禁止 `/admin`、`/api/`、`/search`、`/styleguide`（各写 `$`、`/`、`?` 三条，不误伤 `/search-guide` 这类路径），放行 `/api/media/file/`（分享图与页面图片在这里），声明绝对地址的 `Sitemap` 与 `Host`。**不写 `Allow: /`**：Next 会把全部 Allow 排在 Disallow 前面，而百度按“第一条匹配”生效，开头的 `Allow: /` 会让所有禁止规则对百度失效；现在百度的首条匹配与 Google / Bing 的最长匹配结论一致（单元测试同时按两种规则判定）。预览站构建只输出 `Disallow: /`。
- **元数据**：`buildMetadata` 只接受 1200×630 的分享图，没有时用内置默认图（`src/lib/seo/default-share-image.png`，由 `scripts/seo/generate-default-share-image.ts` 按设计令牌生成）；分页第 2 页起描述加“（第 N 页）”；详情不存在时 `generateMetadata` 直接 `notFound()`；404 的 noindex 由 Next 自动添加（不再自己写一份）。客户端导航后 `<head>` 重复 title / canonical 的问题（M4 记录）在 Next 16.4.6 上无法复现，已加回归测试。
- **元数据审计**（`tests/e2e/seo.e2e.spec.ts`）：以百度爬虫 UA 从首页与 sitemap 出发抓取，逐页检查唯一的 title / description / canonical（绝对地址，与 og:url 一致）、1200×630 的 og:image（下载后量尺寸）、noindex 集合、JSON-LD（可解析、必需字段齐全、绝对地址），并要求 sitemap 与可收录页面集合双向一致。
- **无障碍**（`tests/e2e/a11y.e2e.spec.ts` + `tests/helpers/axe.ts`）：25 种页面状态 × 2 个视口用 axe（wcag2a / wcag2aa）检查 0 个 serious / critical；每页只有一个 h1 且为第一个标题、标题不跳级、跳过链接可用；键盘流程抽查头部大菜单、移动菜单、留资弹窗、灯箱、首页轮播、职业测试、教程弹窗。唯一的发现是 Radix 导航菜单插入的隐藏焦点辅助元素（`aria-hidden-focus`），焦点不会停留在它上面，只把这一个元素排除在 axe 之外（理由写在 helper 中，由 e2e 与单元测试兜底，库升级后形态变化会让测试失败）。axe 无法自动判定的对比度（深色遮罩上的首屏文字、透明整卡按钮、移动端底部操作条后面的内容）需人工复核。
- **性能**：见 PROGRESS M8（移动端 Lighthouse 测量与优化结论）。

## 5. 路由清单

| 路由 | 说明 | 里程碑 |
|---|---|---|
| `/` | 首页（`revalidate = 3600`） | M5 |
| `/courses` | `?discipline=&type=&mode=&city=`，多条件组合页 noindex | M3 |
| `/courses/[slug]` | 课程详情 | M3 |
| `/majors/[slug]` | 专业方向落地页（`/majors` 永久重定向到 `/courses`） | M3 |
| `/works`、`/works/[id]` | `?discipline=&software=&featured=1&page=`（筛选组合 noindex，分页可收录） | M4 |
| `/teachers`、`/teachers/[slug]` | 师资（`?discipline=` 筛选，noindex） | M4 |
| `/careers` | 就业服务 | M6 |
| `/campuses`、`/campuses/[slug]` | 校区 | M6 |
| `/articles`、`/articles/category/[slug]`、`/articles/[slug]` | 资讯 | M6 |
| `/tutorials` | 免费教程（`?discipline=&level=&play=`，noindex） | M7 |
| `/quiz` | 职业测试 | M7 |
| `/search?q=` | 站内搜索（有 q 时 noindex） | M7 |
| `/about` `/contact` | `pages` 集合（通用页面路由 `/[pageSlug]`） | M2 |
| `/privacy` `/terms` | `pages` 集合（通用页面路由 `/[pageSlug]`） | M2 |
| `/sitemap.xml` `/robots.txt` | 站点地图：首页、列表页与全部可收录的已发布详情（不含 noindex、筛选、搜索、`?page=N`）；robots 见 §4.15 | M8 |
| `/styleguide` | 设计规范（开发工具） | M0 |
| `/admin` | Payload 后台 | M0 |
| `/api/*` | Payload REST | M0 |
| `/api/leads/export` | 线索 CSV 导出（按权限过滤，UTF-8 BOM，防公式注入，导出留痕） | M2 |
| `/api/articles/:id/view` | 阅读量上报 | M6 |
| `/api/health` | 健康检查：200 `{"status":"ok"}` / 503 `{"status":"unavailable"}`，`no-store`（不得新建同名 Payload 集合或端点） | M8 |

## 6. 核心组件

| 类别 | 组件 |
|---|---|
| 版式（M0） | `Container`、`Section`（tone: light / paper / dark）、`SectionHeading`、`SkipLink`、`StatusPage` |
| 原子（M0） | `Button`、`Input`、`Textarea`、`Label`、`Checkbox`、`Badge`、`Separator`、`Skeleton` |
| 布局（M2） | `SiteHeader` / `MegaMenu` / `MobileNav`、`SiteFooter`、`FloatingActions`、`MobileActionBar`、`BackToTop`、`Breadcrumbs` |
| 留资（M2） | `LeadForm`（dialog / inline / sidebar）、`LeadDialogProvider` + `useLeadDialog`、`LeadCTA`、`LeadSuccess`、`SourceTracker`、`ConsentField` |
| 内容卡片 | `CourseCard`、`WorkCard`、`TeacherCard`、`ArticleCard`、`CampusCard`、`StoryCard`、`PartnerWall` |
| 课程 | `DisciplineTabs`、`CohortList`、`SyllabusAccordion`、`SalaryReference`（强制来源与免责声明）、`StickyCourseCTA`、`FaqAccordion`、`SoftwareTags` |
| 交互 | `FilterBar`（URL 同步）、`Pagination`（可抓取链接）、`MasonryGrid`、`Lightbox`、`HeroCarousel`（可暂停、尊重减少动态效果）、`VideoEmbed`（域名白名单）、`GatedVideo` |
| 其它 | `QuizRunner` / `QuizReport`、`SearchResults`、`RichText`、`JsonLd`、`MapLinks`、`EmptyState` / `ErrorState` / 骨架屏 |
| 后台定制 | `LeadExportButton`、线索状态徽标、列表默认列与筛选 |

## 7. 设计系统

- **令牌唯一来源**：`src/styles/globals.css`。
  - `@theme static`：原始令牌（色板、字号、间距、版心、圆角、阴影、动效），全部输出为 CSS 变量。
  - `@theme inline`：把语义变量映射成工具类（`bg-background`、`text-muted-foreground` …）。
  - `:root` / `.surface-paper` / `.surface-dark`：语义令牌在三种区块下的取值（`.surface-paper` 先继承浅色基础令牌，可嵌套在深色区块内）。
- **配色**：石墨 `#0b0c0f` 深色区块衬托作品；米色 `#f4f2ee` 区块制造节奏；电光橙 `#ff5b14` 仅用于 CTA，配近黑文字（6.29:1）。浅底上的强调字用橙 700 `#b93c05`（5.66:1）。
- **对比度**：`src/styles/contrast-pairs.ts` 登记的全部语义组合（当前 20 组）× 3 种区块，由单元测试按 WCAG AA 校验；`/styleguide` 实时展示。
- **字体**：中文系统字体栈；标题与数字的西文用 Space Grotesk；正文 16px / 1.7；标题流式字号（390 → 1440px）。
- **版心**：常规 1280px，宽版 1440px，正文 736px；左右留白 16 → 40px；区块上下留白 56 → 120px。
- **圆角**：2 / 4 / 6 / 10px，克制使用；不用大圆角卡片。
- **阴影**：只用于浮层（菜单、弹窗、吸顶栏）；深色区块靠描边分层。

## 8. 风险与对策

1. **广告法第 24 条**（受益者证明）：学员故事化名、不展示个人薪资、授权确认字段、全站开关；上线前法务确认。第 11 条：薪资组件强制来源与统计时间。
2. **后台脚本字段**是存储型 XSS 入口：仅管理员可编辑；百度统计优先填 ID。
3. **webhook 推送个人信息**：默认手机号脱敏；仅允许企业微信 / 飞书 / 钉钉官方域名（防 SSRF）；隐私政策列明第三方。
4. **IP 限频误伤 NAT**：IP 阈值宽松、手机号阈值严格；部署时 nginx 正确传递并信任 `X-Forwarded-For`。
5. **软门槛**：教程解锁与测试报告只是转化引导，不是内容保护。
6. **爬虫陷阱**：筛选组合页 noindex + canonical；专业方向用 `/majors/[slug]` 承接搜索词。
7. **性能**：第三方客服 / 统计脚本延迟到空闲或首次交互加载；首屏轮播第一张图优先加载。
8. **遥测与境外请求**：Next.js 构建遥测通过 `NEXT_TELEMETRY_DISABLED=1` 关闭；Payload 运行时遥测通过 `telemetry: false` 关闭；后台头像使用内置图标（`admin.avatar: 'default'`），不请求 gravatar.com。
9. **global-not-found** 仍是 Next 实验特性（`experimental.globalNotFound`）；升级 Next 时需回归 404 用例。
10. **依赖 Next 内部实现的部分**（M8）：`cache-handler.mjs` 继承内部模块 `file-system-cache.js`；生产镜像使用实验性的 `--experimental-build-mode=compile / generate`。升级 Next 时先跑 `tests/unit/cache-handler.test.ts`，再按 README 在 Docker 中验证一次（空库启动、随机地址 404 不写盘）。
11. **缓存键无限增长**（M7 / M8）：访客可控的值不得直接作为持久缓存键；新增按参数缓存的查询时，先用已发布清单判断（`loadIfKnown`），或只在请求内去重。

## 9. 在线预览站（GitHub Pages）

- 地址：https://doraemonblogs.github.io/EduVerse/ ；工作流 `.github/workflows/preview-pages.yml`，推送默认分支自动发布。
- 构建参数：`NEXT_BASE_PATH=/<仓库名>`（Next basePath，Payload 同步使用）、`NEXT_PUBLIC_STATIC_PREVIEW=true`（页顶提示条、图片不走 `/_next/image` 实时优化）、`ENABLE_STYLEGUIDE=true`。
- 导出：`scripts/preview/export-static.ts` 从 `ENTRY_PATHS` 与 sitemap.xml 中的地址出发顺着站内链接抓取页面（M8 起同时导出 `robots.txt`（预览站为 `Disallow: /`）与 `sitemap.xml`，并校验地址带子路径），每页写 `x.html` 与 `x/index.html`，注入 `noindex, nofollow`；下载页面引用的非构建资源（M1 起包括 `/api/media/file/*` 媒体文件）；整体复制 `.next/static`；生成 `404.html`；最后校验所有站内链接与资源都在输出目录中，否则失败。
- 限制：静态托管无法执行服务端逻辑，表单提交（Server Action）、后台、按查询串筛选（`/courses?discipline=…` 只能导出无参数版本）不可用；客户端导航取不到 RSC 数据时自动回退为整页跳转。
- 数据（M1 起）：工作流中用 PostgreSQL 服务容器 + 种子数据渲染页面，数据库随任务销毁，密钥每次随机生成。
- 约束：站内链接用 `next/link`（自动带 basePath）；`next/image` 的字符串 `src`（媒体 URL）不会自动带 basePath，需经工具函数处理。导出脚本会把缺少 basePath 的引用、依赖查询串的资源（`/_next/image`、`/api/*`）报为错误。

## 10. 生产部署

```
访客 ─HTTPS─▶ nginx（宿主机：证书、gzip、限速、静态长缓存、真实 IP）─▶ app 127.0.0.1:3000（Next + Payload，同一进程）─▶ postgres（只在 compose 内网）
                                                                         └─ media 卷（上传文件）
```

- **镜像**（`Dockerfile`）：base（corepack 安装 pnpm）→ deps → prod-deps → builder → runner；Node 22（`node:22-bookworm-slim`，sharp 预编译包可用），非 root 用户运行，`HEALTHCHECK` 访问 `/api/health`，`/app/media` 为卷。构建参数 `NODE_IMAGE`、`NPM_REGISTRY`（国内可换镜像源，默认官方）、`NEXT_PUBLIC_SITE_URL`（必填，构建时写入产物，换域名需重新构建）。可选构建密钥 `extra_ca` 只在下载依赖时挂载，不进入镜像。
- **构建不连数据库**：`next build --experimental-build-mode=compile` 只编译，镜像与数据库内容无关。容器启动时（`deploy/docker-entrypoint.sh`）依次：用 `POSTGRES_*` 拼出（URL 编码的）`DATABASE_URL` → 校验 `PAYLOAD_SECRET` 至少 32 位 → `payload migrate`（失败则退出，不启动服务）→ 从镜像内干净的构建产物重置 `.next` → `--experimental-build-mode=generate` 连上数据库预渲染（与 `pnpm build` 的静态页 / ISR 行为一致；失败时告警并退回按请求渲染，`PRERENDER_ON_START=false` 可跳过）→ `exec next start`。compile / generate 是 Next 的实验性构建模式，升级 Next 时需复查。
- **compose**（`docker-compose.yml`）：`app` + `postgres:16`（镜像可用 `POSTGRES_IMAGE` 替换），健康检查、`pgdata` 与 `media` 数据卷、tini、日志轮转（5 × 10MB）；数据库不映射到宿主，app 只绑定 127.0.0.1；`TRUST_PROXY=true`（前面必须有 nginx）。配置来自 `deploy/.env.production`（git 与 docker 构建上下文均忽略；含 `$`、` #`、空格的值必须用单引号，否则 compose 会静默截断）。
- **nginx**（`deploy/nginx.conf.example`）：HTTP 跳转 HTTPS、HTTP/2、HSTS、安全响应头；`X-Forwarded-For $proxy_add_x_forwarded_for` 与 `X-Real-IP`（限频依赖真实 IP）；`client_max_body_size` 适配 50MB 视频；`/_next/static` 由 nginx 再缓存 30 天（`proxy_cache`）；app 返回 `X-Accel-Buffering: no`，流式渲染不被缓冲；压缩由 nginx 统一做（转发时去掉 `Accept-Encoding`）。限速分区（按 IP）：页面 20 r/s（burst 100）、搜索 3 r/s、阅读量上报 2 r/s、登录 10 r/min、其余 `/api/` 与 `/_next/image` 各 20 r/s（burst 200）；`/admin` 不限速。
- **备份 / 恢复**：`deploy/backup.sh`（pg_dump + media 打包，保留 7 天）、`deploy/restore.sh`（需 `--yes`；最后一步会启动 app，app 启动会执行迁移，所以回滚时先 `export APP_IMAGE=<旧镜像>`）。M2 迁移的 down 无法执行，**生产回滚一律用“备份 + 上一版镜像”**（README「回滚」）。
- **已知限制**：镜像约 1.8GB（不使用 standalone，见 §1）；没有配置邮件适配器，找回密码邮件只写入日志；Server Action 的 ID 每次构建都会变，升级前打开的页面需刷新后才能提交表单；限流、阅读量去重、同手机号串行控制都在进程内，只适用于单实例。
- **切换对象存储**（未实施，PRD §2 保留能力）：加入 `@payloadcms/storage-s3`，在 `payload.config.ts` 中按环境变量（桶、地域、endpoint、密钥）为 `media` 集合启用（阿里云 OSS / 腾讯云 COS 均兼容 S3 协议）；迁移已有文件后，媒体地址变为对象存储地址，nginx 的 `/api/media/file/` 配置与备份脚本中的 media 部分随之调整。
