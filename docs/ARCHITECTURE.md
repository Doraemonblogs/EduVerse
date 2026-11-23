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
| 部署 | Next standalone + 多阶段 Dockerfile + docker-compose（app + postgres），媒体存本地卷 | M8 接入 `@payloadcms/storage-s3`（环境变量开关，兼容 OSS / COS） |
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
| @axe-core/playwright | M8（计划） | 无障碍自动检查 |
| @payloadcms/storage-s3 | M8（计划） | 切换对象存储 |

刻意不引入：轮播库（CSS scroll-snap + 小 hook）、瀑布流库（已知宽高比 + 最短列算法）、灯箱库（Radix Dialog）、react-hook-form、任何统计 / 客服 SDK。

## 2. 架构要点

### 2.1 渲染与缓存
- 页面默认是服务端组件，通过 Payload Local API 直接查库，不走 HTTP。
- 数据查询集中在 `src/lib/data/*`，每个查询带缓存标签（如 `courses`、`course:<slug>`、`global:site-settings`）。
- Payload 集合 / 全局配置的 `afterChange` / `afterDelete` 钩子调用 `revalidateTag(tag, 'max')`，后台发布即生效。
- 筛选页（`/courses`、`/works`）按 searchParams 动态渲染，底层查询仍走缓存。
- 阅读量等高频写入使用原生 SQL 自增，**绕过 Payload 钩子**，避免触发缓存失效与版本记录。

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
      sitemap.ts robots.ts
    (payload)/             Payload 生成的 admin 与 /api
    global-not-found.tsx
  collections/ globals/ fields/(seo, slug, consent) access/ hooks/
  components/ ui/ common/ layout/ lead/ course/ works/ home/ article/ quiz/ styleguide/
  lib/ data/ validation/ lead/(rate-limit, webhook, csv) seo/ a11y/ utils.ts
  i18n/zh.ts  styles/globals.css  styles/contrast-pairs.ts  fonts/  config/site.ts
  payload.config.ts  payload-types.ts  migrations/
scripts/seed/ (index.ts, data/*.ts, placeholders.ts)
tests/unit/ tests/int/ tests/e2e/ tests/helpers/
docs/ docker/ docker-compose.dev.yml
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
- **careers-page**、**quiz-settings**。
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
- **暂不链接**：作品详情、讲师详情（M4）与校区详情（M6）尚未上线，课程与专业页中只展示、不加链接。
- `/majors` 永久重定向到 `/courses`；`/courses`、`/majors` 已从预览站导出脚本的 `PLANNED_ROUTES` 移除。

## 5. 路由清单

| 路由 | 说明 | 里程碑 |
|---|---|---|
| `/` | 首页 | M5 |
| `/courses` | `?discipline=&type=&mode=&city=`，多条件组合页 noindex | M3 |
| `/courses/[slug]` | 课程详情 | M3 |
| `/majors/[slug]` | 专业方向落地页（`/majors` 永久重定向到 `/courses`） | M3 |
| `/works`、`/works/[id]` | `?discipline=&software=&featured=&page=` | M4 |
| `/teachers`、`/teachers/[slug]` | 师资 | M4 |
| `/careers` | 就业服务 | M6 |
| `/campuses`、`/campuses/[slug]` | 校区 | M6 |
| `/articles`、`/articles/category/[slug]`、`/articles/[slug]` | 资讯 | M6 |
| `/tutorials` | 免费教程 | M7 |
| `/quiz` | 职业测试 | M7 |
| `/search?q=` | 站内搜索 | M7 |
| `/about` `/contact` | `pages` 集合（通用页面路由 `/[pageSlug]`） | M2 |
| `/privacy` `/terms` | `pages` 集合（通用页面路由 `/[pageSlug]`） | M2 |
| `/sitemap.xml` `/robots.txt` | | M8 |
| `/styleguide` | 设计规范（开发工具） | M0 |
| `/admin` | Payload 后台 | M0 |
| `/api/*` | Payload REST | M0 |
| `/api/leads/export` | 线索 CSV 导出（按权限过滤，UTF-8 BOM，防公式注入，导出留痕） | M2 |
| `/api/articles/:id/view` | 阅读量上报 | M6 |

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

## 9. 在线预览站（GitHub Pages）

- 地址：https://doraemonblogs.github.io/EduVerse/ ；工作流 `.github/workflows/preview-pages.yml`，推送默认分支自动发布。
- 构建参数：`NEXT_BASE_PATH=/<仓库名>`（Next basePath，Payload 同步使用）、`NEXT_PUBLIC_STATIC_PREVIEW=true`（页顶提示条、图片不走 `/_next/image` 实时优化）、`ENABLE_STYLEGUIDE=true`。
- 导出：`scripts/preview/export-static.ts` 从 `ENTRY_PATHS` 出发顺着站内链接抓取页面，每页写 `x.html` 与 `x/index.html`，注入 `noindex, nofollow`；下载页面引用的非构建资源（M1 起包括 `/api/media/file/*` 媒体文件）；整体复制 `.next/static`；生成 `404.html`；最后校验所有站内链接与资源都在输出目录中，否则失败。
- 限制：静态托管无法执行服务端逻辑，表单提交（Server Action）、后台、按查询串筛选（`/courses?discipline=…` 只能导出无参数版本）不可用；客户端导航取不到 RSC 数据时自动回退为整页跳转。
- 数据（M1 起）：工作流中用 PostgreSQL 服务容器 + 种子数据渲染页面，数据库随任务销毁，密钥每次随机生成。
- 约束：站内链接用 `next/link`（自动带 basePath）；`next/image` 的字符串 `src`（媒体 URL）不会自动带 basePath，需经工具函数处理。导出脚本会把缺少 basePath 的引用、依赖查询串的资源（`/_next/image`、`/api/*`）报为错误。
