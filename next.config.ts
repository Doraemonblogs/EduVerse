import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/**
 * 子路径部署（如 GitHub Pages 预览站 https://<user>.github.io/EduVerse/）时设置 NEXT_BASE_PATH=/EduVerse。
 * 正式站部署在域名根路径，不设置。withPayload 会把 basePath 同步到 process.env.NEXT_BASE_PATH 供后台使用。
 */
const basePath = process.env.NEXT_BASE_PATH?.replace(/\/+$/, '') || undefined
if (basePath && !/^\/[\w-]+(\/[\w-]+)*$/.test(basePath)) {
  throw new Error(`NEXT_BASE_PATH 格式不正确：${basePath}（应形如 /EduVerse）`)
}

/** 静态预览站：页面被抓取为静态文件托管，图片不能依赖按请求参数实时优化的 /_next/image */
const isStaticPreview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === 'true'

/**
 * 前台页面：除后台（/admin）、接口（/api，含媒体文件）与构建产物（/_next）以外的全部路径。
 * 只排除完整的一级路径段，/administration 这类通用页面仍然算前台。
 */
export const FRONTEND_PAGES_SOURCE = '/:path((?!(?:admin|api|_next)(?:/|$)).*)'

/** 后台媒体文件（Payload 本地存储的上传文件） */
export const MEDIA_FILES_SOURCE = '/api/media/file/:path*'

/**
 * 前台页面的 Cache-Control。设置后 Next 不再写自己的值（ISR 的 s-maxage / 动态页的 private, no-store），
 * 这里显式给出完整语义：
 * - no-transform：百度移动搜索等不对页面转码（PRD §7 百度专项）；
 * - private：不在 CDN / 运营商代理等共享缓存中存储（本项目部署不使用 CDN 缓存 HTML；页面缓存由 Next 服务端完成）；
 * - no-cache：浏览器每次使用前向服务器确认（带 ETag，未变化时 304）。不用 no-store，前进 / 后退可用往返缓存。
 * 前台页面不含按用户区分的内容（留资走 Server Action 的 POST 请求，不受影响）。出错的响应 Next 仍会改为 no-store。
 *
 * 压缩由 nginx 负责：Next 内置的 gzip（compression 包）遇到 no-transform 会跳过，直接访问 `next start` 时
 * 页面与 RSC 响应都不压缩（首页 HTML 约 540KB）；deploy/nginx.conf.example 的 gzip 不受影响（约 65KB）。
 * 不要绕过 nginx 直接对外提供 app；在 3100 端口直接跑 Lighthouse 的分数也因此偏低，以经 nginx 测得的为准。
 */
export const FRONTEND_CACHE_CONTROL = 'private, no-cache, no-transform'

/**
 * 媒体文件的 Cache-Control：文件名含尺寸但不含内容哈希，后台替换文件后可能沿用同一地址，
 * 不能用一年 + immutable。浏览器缓存 1 天，过期后 7 天内先用旧文件、后台重新获取；
 * /_next/image 也按这个 max-age（不低于 images.minimumCacheTTL）缓存优化后的图片。
 * 代价：替换同名文件后最迟 1 天全部生效。next.config 的响应头不区分状态码，直接访问 app 时文件缺失的错误响应
 * 也带这个头；经 nginx（deploy/nginx.conf.example）访问时只在成功响应上设置，错误响应不缓存。
 */
export const MEDIA_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

/** Next 16.4.6 默认的 HTML 受限爬虫列表（next/dist/shared/lib/router/utils/html-bots.js 的 HTML_LIMITED_BOT_UA_RE），原样复制 */
const NEXT_DEFAULT_HTML_LIMITED_BOTS =
  '[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight'

/**
 * 需要“阻塞式”元数据的爬虫：对这些 UA，title / description / canonical 等一定输出在 <head> 中，
 * 不会在数据较慢时随流式渲染插入 <body>（只读 <head> 的爬虫会漏掉）。
 * 设置后会替换 Next 的默认列表，因此先保留默认列表（已含百度 baiduspider、搜狗 sogou），
 * 再加上国内常见而默认列表没有的：360 搜索（360Spider / HaosouSpider）、神马（YisouSpider）、头条搜索（Bytespider）。
 * 不加微信（MicroMessenger）：同一 UA 也是微信内置浏览器，会让真实访客失去流式渲染。
 * Next 只取正则的 source、运行时不区分大小写匹配；升级 Next 时由单元测试核对默认列表是否变化。
 */
export const HTML_LIMITED_BOTS = new RegExp(
  `${NEXT_DEFAULT_HTML_LIMITED_BOTS}|360Spider|HaosouSpider|YisouSpider|Bytespider`,
  'i',
)

const nextConfig: NextConfig = {
  basePath,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // 不自动生成 AGENTS.md：同样的约定（以 node_modules/next/dist/docs 为准）已写在 CLAUDE.md
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  /**
   * 服务端缓存有上限（docs/ARCHITECTURE.md §2.1、M8）：
   * - 内存：ISR 页面与数据缓存（unstable_cache）共用的 LRU，64MB；
   * - 磁盘上的数据缓存（.next/cache/fetch-cache）与页面缓存（.next/server/route-cache）都不自动淘汰，条目数由下面两处保证有界：
   *   按参数缓存的详情查询只接受已发布清单中的 slug / ID（src/lib/data/known-key.ts），随机路径不写数据缓存；
   *   随机路径渲染出的 404 页面只放内存、不写盘（cacheHandler，见 cache-handler.mjs；只在生产环境启用，开发服务器不受影响）；
   * - 不关闭磁盘写入（experimental.isrFlushToDisk）：关闭后图片优化的磁盘缓存也会一并停用，每次请求重新压缩图片。
   */
  cacheMaxMemorySize: 64 * 1024 * 1024,
  cacheHandler:
    process.env.NODE_ENV === 'production' ? path.join(dirname, 'cache-handler.mjs') : undefined,
  images: {
    unoptimized: isStaticPreview,
    // 媒体文件由 Payload 通过 /api/media/file/* 提供
    localPatterns: [{ pathname: '/api/media/file/**' }],
    formats: ['image/avif', 'image/webp'],
    /**
     * 去掉默认的 2048 / 3840：后台图片最大的尺寸是 hero（宽 1920，见 src/collections/Media.ts），
     * 优化器不放大图片，更宽的候选只会返回同一张图，却让每个 <img> 的 srcset 多出两条地址
     * （首页约 15KB HTML）、回退 src 指向 w=3840，并多占一份图片缓存。
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // 优化后图片的磁盘缓存（.next/cache/images）上限 500MB，超出按最近最少使用淘汰（默认是可用磁盘空间的一半）
    maximumDiskCacheSize: 500 * 1000 * 1000,
  },
  async headers() {
    return [
      {
        source: FRONTEND_PAGES_SOURCE,
        headers: [
          { key: 'Cache-Control', value: FRONTEND_CACHE_CONTROL },
          // 流式渲染的页面不被 nginx 缓冲（nginx 读取该头后不会转发给浏览器）
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
      {
        source: MEDIA_FILES_SOURCE,
        headers: [{ key: 'Cache-Control', value: MEDIA_CACHE_CONTROL }],
      },
    ]
  },
  experimental: {
    // 前台与后台是两个根布局，未匹配任何路由的 URL 由 app/global-not-found.tsx 处理
    globalNotFound: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

/** 后台路由（含 /admin 本身）；Next 会自动补上 basePath */
export const ADMIN_PAGES_SOURCE = '/admin/:path*'

/**
 * withPayload 给全站（/:path*）加 `Accept-CH` / `Critical-CH` / `Vary: Sec-CH-Prefers-Color-Scheme`，
 * 供后台首屏按系统深浅色渲染（@payloadcms/next 的 getRequestTheme 读取该请求头）。前台不读这个请求头，
 * 但 Critical-CH 会让 Chromium 系浏览器首次访问站点时丢弃已收到的页面、带上该请求头把导航重发一遍
 * （多一次往返与一次服务端渲染；Lighthouse 记为一次重定向，移动端模拟约 600ms）。
 * 这里只把这条规则的匹配范围收窄到后台，规则内容不变；Payload 改变规则形态时由单元测试发现。
 */
function scopeClientHintsToAdmin(config: NextConfig): NextConfig {
  const withPayloadHeaders = config.headers
  if (!withPayloadHeaders) return config
  return {
    ...config,
    async headers() {
      const rules = await withPayloadHeaders()
      return rules.map((rule) =>
        rule.source === '/:path*' &&
        rule.headers.some((header) => header.key.toLowerCase() === 'critical-ch')
          ? { ...rule, source: ADMIN_PAGES_SOURCE }
          : rule,
      )
    },
  }
}

export default scopeClientHintsToAdmin(withPayload(nextConfig, { devBundleServerPackages: false }))
