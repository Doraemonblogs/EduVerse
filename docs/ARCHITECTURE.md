# 架构设计

> 与 `docs/PRD.md` 配套。数据模型在 M1 落地时如有调整，同步更新本文件并在 `docs/PROGRESS.md` 记录原因。

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
3. Server Action `submitLead` 依次：zod 校验 → honeypot（命中则伪装成功）→ 最短填写时间（< 2s 视为机器）→ 进程内突发限流 → 数据库限频（同 IP 10 分钟 / 同手机号 24 小时，阈值后台可配）→ 重复判定（30 天内同手机号：标记重复、关联原线索、分配给原顾问）→ `payload.create({ overrideAccess: true })`。
4. 写入后把 webhook 推送放入 Payload 任务队列（重试 3 次，结果记在线索上）。
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
- **careers-page**、**quiz-settings**。
- **lead-settings**：webhooks[] { name, platform: wecom / feishu / dingtalk, url（仅允许三家官方域名）, secret, enabled, maskPhone }、rateLimits、cityOptions[]、successMessage。

扩展预留：学员账号用新集合 `members`（与后台 `users` 分离），线索可关联；订单 / 课节作为新集合挂在课程下，不改现有字段。

## 5. 路由清单

| 路由 | 说明 | 里程碑 |
|---|---|---|
| `/` | 首页 | M5 |
| `/courses` | `?discipline=&type=&mode=&city=`，多条件组合页 noindex | M3 |
| `/courses/[slug]` | 课程详情 | M3 |
| `/majors/[slug]` | 专业方向落地页 | M3 |
| `/works`、`/works/[id]` | `?discipline=&software=&featured=&page=` | M4 |
| `/teachers`、`/teachers/[slug]` | 师资 | M4 |
| `/careers` | 就业服务 | M6 |
| `/campuses`、`/campuses/[slug]` | 校区 | M6 |
| `/articles`、`/articles/category/[slug]`、`/articles/[slug]` | 资讯 | M6 |
| `/tutorials` | 免费教程 | M7 |
| `/quiz` | 职业测试 | M7 |
| `/search?q=` | 站内搜索 | M7 |
| `/about` `/contact` | `pages` 集合 | M6 |
| `/privacy` `/terms` | `pages` 集合 | M2 |
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
- 约束：站内链接必须使用 `next/link` / `next/image` 以带上 basePath。
