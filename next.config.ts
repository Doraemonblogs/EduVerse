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

const nextConfig: NextConfig = {
  basePath,
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

export default withPayload(nextConfig, { devBundleServerPackages: false })
