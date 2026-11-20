/**
 * 导出静态预览站（GitHub Pages）。
 *
 * 前提：已用预览配置构建并启动生产服务，例如
 *   NEXT_BASE_PATH=/EduVerse NEXT_PUBLIC_STATIC_PREVIEW=true ENABLE_STYLEGUIDE=true pnpm build
 *   NEXT_BASE_PATH=/EduVerse ENABLE_STYLEGUIDE=true pnpm start --port 3000
 * 然后：
 *   pnpm preview:export --origin http://localhost:3000 --base-path /EduVerse --out preview-dist
 *
 * 做的事：从入口页开始抓取站内页面 → 保存 HTML（注入 noindex）→ 下载页面引用的非构建资源
 * → 复制 .next/static → 生成 404.html 与 .nojekyll → 校验输出中没有断链。任何错误都以非零退出。
 */
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

import {
  applyNoindex,
  assetOutputFile,
  extractCssUrls,
  extractRefs,
  hasQuery,
  isMissingBasePath,
  isPagePath,
  isQueryDependentPath,
  pageOutputFiles,
  pageUrl,
  type SiteConfig,
  toSitePath,
} from './lib'

/** 入口页面：从这里开始顺着站内链接抓取；未被链接到但需要预览的页面也登记在这里 */
const ENTRY_PATHS = ['/', '/styleguide']
/** 可选资源：存在就导出，不存在忽略 */
const OPTIONAL_ASSETS = ['/favicon.ico', '/icon.png', '/apple-icon.png']
const NOT_FOUND_PROBE = '/__static-preview-not-found__'

const { values } = parseArgs({
  options: {
    origin: { type: 'string', default: 'http://localhost:3000' },
    'base-path': { type: 'string', default: process.env.NEXT_BASE_PATH ?? '' },
    out: { type: 'string', default: 'preview-dist' },
    'next-dir': { type: 'string', default: '.next' },
  },
})

const config: SiteConfig = {
  origin: values.origin!.replace(/\/+$/, ''),
  basePath: values['base-path']!.replace(/\/+$/, ''),
}
const outDir = path.resolve(values.out!)
const nextStaticDir = path.resolve(values['next-dir']!, 'static')

const errors: string[] = []
const exportedPages = new Set<string>()
const exportedAssets = new Set<string>()

async function writeOut(rel: string, data: string | Uint8Array) {
  const file = path.join(outDir, rel)
  if (!file.startsWith(outDir + path.sep)) throw new Error(`拒绝写出目录之外的路径：${rel}`)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, data)
}

async function exists(file: string) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

/** 收集页面中引用的资源（构建产物 /_next/static 整体复制，不逐个下载） */
function collectAssets(html: string, fromUrl: string, into: Set<string>) {
  for (const ref of extractRefs(html).assets) {
    if (isMissingBasePath(ref, fromUrl, config)) {
      errors.push(`引用缺少 basePath（${config.basePath}）：${ref}（页面 ${fromUrl}）`)
      continue
    }
    const sitePath = toSitePath(ref, fromUrl, config)
    if (!sitePath || sitePath.startsWith('/_next/static/')) continue
    // 带查询串的普通静态文件（如 Next 给图标加的缓存参数）按路径导出即可；
    // 内容随查询串变化的接口（/_next/image、/api/*）静态托管无法提供
    if (hasQuery(ref, fromUrl) && isQueryDependentPath(sitePath)) {
      errors.push(`资源依赖查询串，静态托管无法提供：${ref}（页面 ${fromUrl}）`)
      continue
    }
    if (isPagePath(sitePath)) continue
    into.add(sitePath)
  }
}

async function crawlPages(assets: Set<string>) {
  const queue = [...ENTRY_PATHS]
  const seen = new Set(queue)

  while (queue.length > 0) {
    const sitePath = queue.shift()!
    const url = pageUrl(config, sitePath)
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status !== 200) {
      errors.push(`页面返回 ${res.status}：${url}`)
      continue
    }
    const html = await res.text()
    for (const rel of pageOutputFiles(sitePath)) await writeOut(rel, applyNoindex(html))
    exportedPages.add(sitePath)
    collectAssets(html, url, assets)

    for (const link of extractRefs(html).links) {
      if (isMissingBasePath(link, url, config)) {
        errors.push(`链接缺少 basePath（${config.basePath}）：${link}（页面 ${url}）`)
        continue
      }
      const target = toSitePath(link, url, config)
      if (target && isPagePath(target) && !seen.has(target)) {
        seen.add(target)
        queue.push(target)
      }
    }
  }
}

async function exportNotFound(assets: Set<string>) {
  const url = pageUrl(config, NOT_FOUND_PROBE)
  const res = await fetch(url, { redirect: 'manual' })
  if (res.status !== 404) {
    errors.push(`404 探测页应返回 404，实际 ${res.status}：${url}`)
    return
  }
  const html = await res.text()
  await writeOut('404.html', applyNoindex(html))
  collectAssets(html, url, assets)
}

async function downloadAssets(assets: Set<string>) {
  const queue = [...assets]
  while (queue.length > 0) {
    const sitePath = queue.shift()!
    if (exportedAssets.has(sitePath)) continue
    const url = pageUrl(config, sitePath)
    const res = await fetch(url)
    if (!res.ok) {
      if (!OPTIONAL_ASSETS.includes(sitePath)) errors.push(`资源返回 ${res.status}：${url}`)
      continue
    }
    const body = new Uint8Array(await res.arrayBuffer())
    await writeOut(assetOutputFile(sitePath), body)
    exportedAssets.add(sitePath)

    if ((res.headers.get('content-type') ?? '').includes('text/css')) {
      for (const ref of extractCssUrls(new TextDecoder().decode(body))) {
        const nested = toSitePath(ref, url, config)
        if (nested && !nested.startsWith('/_next/static/') && !exportedAssets.has(nested)) {
          queue.push(nested)
        }
      }
    }
  }
}

/** 校验：输出中的每个站内页面链接与资源引用都能在输出目录里找到 */
async function verifyOutput(htmlFiles: string[]) {
  for (const rel of htmlFiles) {
    const html = await readFile(path.join(outDir, rel), 'utf8')
    const fromUrl = `${config.origin}${config.basePath}/${rel}`
    const { links, assets } = extractRefs(html)

    for (const ref of [...links, ...assets]) {
      if (isMissingBasePath(ref, fromUrl, config)) {
        errors.push(`引用缺少 basePath（${config.basePath}）：${rel} 引用了 ${ref}`)
      }
    }
    for (const link of links) {
      const target = toSitePath(link, fromUrl, config)
      if (target && isPagePath(target) && !exportedPages.has(target)) {
        errors.push(`断链：${rel} 链接到未导出的页面 ${target}`)
      }
    }
    for (const ref of assets) {
      const target = toSitePath(ref, fromUrl, config)
      if (!target || isPagePath(target)) continue
      if (!(await exists(path.join(outDir, assetOutputFile(target))))) {
        errors.push(`缺少资源：${rel} 引用了 ${target}`)
      }
    }
  }
}

async function main() {
  console.info(`导出静态预览站：${config.origin}${config.basePath || '/'} → ${outDir}`)
  if (!(await exists(nextStaticDir))) {
    throw new Error(`找不到构建产物 ${nextStaticDir}，请先运行 pnpm build`)
  }
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const assets = new Set<string>(OPTIONAL_ASSETS)
  await crawlPages(assets)
  await exportNotFound(assets)
  await downloadAssets(assets)

  await cp(nextStaticDir, path.join(outDir, '_next', 'static'), { recursive: true })
  // GitHub Pages 默认用 Jekyll 处理，会忽略下划线开头的目录（_next）
  await writeOut('.nojekyll', '')

  const htmlFiles = [...exportedPages].flatMap(pageOutputFiles).concat('404.html')
  await verifyOutput(htmlFiles)

  console.info(`页面 ${exportedPages.size} 个：${[...exportedPages].join('、')}`)
  console.info(`资源 ${exportedAssets.size} 个（另含 .next/static 全部构建产物）`)
  if (errors.length > 0) {
    console.error(`\n导出失败，共 ${errors.length} 个问题：`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.info('导出完成，未发现断链。')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
