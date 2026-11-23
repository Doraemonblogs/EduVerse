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

const nextConfig: NextConfig = {
  basePath,
  // 不自动生成 AGENTS.md：同样的约定（以 node_modules/next/dist/docs 为准）已写在 CLAUDE.md
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: isStaticPreview,
    // 媒体文件由 Payload 通过 /api/media/file/* 提供
    localPatterns: [{ pathname: '/api/media/file/**' }],
    formats: ['image/avif', 'image/webp'],
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
