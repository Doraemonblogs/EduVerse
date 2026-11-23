import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * 静态预览站导出脚本（scripts/preview/export-static.ts）：对一个模拟的生产服务（basePath /EduVerse）
 * 运行真实脚本，验证只出现在 RSC 数据 / <meta content> 里的媒体文件会被导出并参与断链校验，
 * robots.txt / sitemap.xml 的导出与校验，以及计划路由为空时断链即失败。
 * 模拟页面按预览构建的结构编写（图片不经优化接口，媒体地址带 basePath）。
 */

const BASE = '/EduVerse'
const SITE = 'https://doraemonblogs.github.io/EduVerse'
const SCRIPT = path.resolve('scripts/preview/export-static.ts')

/** 服务端提供的媒体文件 */
const MEDIA = new Set(['thumb-400x533.webp', 'hero-1050x1400.webp', 'share-1200x630.webp'])

const page = (head: string, body: string) =>
  `<!DOCTYPE html><html lang="zh-CN"><head><meta charSet="utf-8"/>${head}</head><body>${body}</body></html>`

/** 作品详情：缩略图在属性里；灯箱大图只在 RSC 数据里；分享图只在 <meta content> 里 */
const workPage = (heroRef: string) =>
  page(
    `<meta property="og:image" content="${SITE}/api/media/file/share-1200x630.webp"/>`,
    [
      `<a href="${BASE}/">首页</a>`,
      `<img alt="" src="${BASE}/api/media/file/thumb-400x533.webp"/>`,
      String.raw`<script>self.__next_f.push([1,"5:[\"$\",\"$L218\",null,{\"items\":[{\"image\":{\"src\":\"${heroRef}\",\"width\":1050,\"height\":1400},\"thumb\":{\"src\":\"/EduVerse/api/media/file/thumb-400x533.webp\"}}]}]\n"])</script>`,
    ].join(''),
  )

/** 预览构建输出的 robots.txt（全部禁止抓取） */
const PREVIEW_ROBOTS = 'User-Agent: *\nDisallow: /\n'
/** sitemap：首页与一个没有被任何页面链接到的页面（用户协议） */
const sitemapXml = (locs: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs
    .map((loc) => `<url><loc>${loc}</loc></url>`)
    .join('')}</urlset>`
const DEFAULT_SITEMAP = sitemapXml([SITE, `${SITE}/terms`])

let server: Server
let origin = ''
let workHtml = ''
let homeHtml = ''
let robotsTxt = PREVIEW_ROBOTS
let sitemap = DEFAULT_SITEMAP
let root = ''

const defaultHome = () => page('', `<a href="${BASE}/works/1">作品</a>`)

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'preview-export-'))
  // 脚本会整体复制构建产物目录，给一个最小的 .next/static
  await mkdir(path.join(root, 'next', 'static', 'chunks'), { recursive: true })
  await writeFile(path.join(root, 'next', 'static', 'chunks', 'main.js'), '')
  // 内置兜底分享图（静态导入的图片在构建产物里）
  await mkdir(path.join(root, 'next', 'static', 'media'), { recursive: true })
  await writeFile(path.join(root, 'next', 'static', 'media', 'share.png'), '')

  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { 'content-type': type })
      res.end(body)
    }
    const html = (status: number, body: string) => send(status, 'text/html; charset=utf-8', body)
    const file = url.pathname.startsWith(`${BASE}/api/media/file/`)
      ? url.pathname.slice(`${BASE}/api/media/file/`.length)
      : null

    if (url.pathname === BASE) return html(200, homeHtml)
    if (url.pathname === `${BASE}/robots.txt`) return send(200, 'text/plain', robotsTxt)
    if (url.pathname === `${BASE}/sitemap.xml`) return send(200, 'application/xml', sitemap)
    if (url.pathname === `${BASE}/terms`) return html(200, page('', '<h1>用户协议</h1>'))
    if (url.pathname === `${BASE}/styleguide`) return html(200, page('', '<p>设计规范</p>'))
    if (url.pathname === `${BASE}/works/1`) return html(200, workHtml)
    if (file && MEDIA.has(file)) return send(200, 'image/webp', Buffer.from(file))
    return html(404, page('', '<h1>页面不存在</h1>'))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}, 30_000)

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()))
  if (root) await rm(root, { recursive: true, force: true })
})

/** 运行导出脚本，返回退出码与输出 */
async function runExport(out: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [
        '--import',
        'tsx',
        SCRIPT,
        ...['--origin', origin, '--base-path', BASE],
        ...['--out', out, '--next-dir', path.join(root, 'next')],
      ],
      { cwd: process.cwd(), timeout: 60_000 },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
        resolve({ code, output: `${stdout}\n${stderr}` })
      },
    )
  })
}

beforeEach(() => {
  homeHtml = defaultHome()
  robotsTxt = PREVIEW_ROBOTS
  sitemap = DEFAULT_SITEMAP
})

describe('静态预览站导出脚本', () => {
  it('导出只出现在 RSC 数据与 <meta content> 里的媒体文件（灯箱大图、分享图）', async () => {
    workHtml = workPage(`${BASE}/api/media/file/hero-1050x1400.webp`)
    const out = path.join(root, 'ok')
    const { code, output } = await runExport(out)
    expect(output).toContain('导出完成，未发现断链')
    expect(code).toBe(0)
    for (const name of MEDIA) {
      expect(existsSync(path.join(out, 'api', 'media', 'file', name))).toBe(true)
    }
    expect(existsSync(path.join(out, 'works', '1.html'))).toBe(true)
  }, 60_000)

  it('RSC 数据里引用的媒体文件下载不到时导出失败（不会报“未发现断链”）', async () => {
    workHtml = workPage(`${BASE}/api/media/file/missing-1050x1400.webp`)
    const { code, output } = await runExport(path.join(root, 'missing'))
    expect(code).not.toBe(0)
    expect(output).toContain('资源返回 404')
    expect(output).toContain('缺少资源：works/1.html 引用了 /api/media/file/missing-1050x1400.webp')
    expect(output).not.toContain('未发现断链')
  }, 60_000)

  it('RSC 数据里的媒体地址缺少 basePath 时导出失败', async () => {
    workHtml = workPage('/api/media/file/hero-1050x1400.webp')
    const { code, output } = await runExport(path.join(root, 'no-base'))
    expect(code).not.toBe(0)
    expect(output).toContain(
      '媒体引用缺少 basePath（/EduVerse）：/api/media/file/hero-1050x1400.webp',
    )
  }, 60_000)
})

describe('静态预览站导出脚本：robots.txt 与 sitemap.xml', () => {
  it('原样导出 robots.txt 与 sitemap.xml；sitemap 中未被链接到的页面也导出', async () => {
    workHtml = workPage(`${BASE}/api/media/file/hero-1050x1400.webp`)
    const out = path.join(root, 'crawler-files')
    const { code, output } = await runExport(out)
    expect(output).toContain('导出完成，未发现断链')
    expect(code).toBe(0)
    expect(await readFile(path.join(out, 'robots.txt'), 'utf8')).toBe(PREVIEW_ROBOTS)
    expect(await readFile(path.join(out, 'sitemap.xml'), 'utf8')).toBe(DEFAULT_SITEMAP)
    expect(existsSync(path.join(out, 'terms.html'))).toBe(true)
  }, 60_000)

  it('robots.txt 没有禁止全部抓取（不是预览构建）时导出失败', async () => {
    workHtml = workPage(`${BASE}/api/media/file/hero-1050x1400.webp`)
    robotsTxt = `User-Agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`
    const { code, output } = await runExport(path.join(root, 'robots-open'))
    expect(code).not.toBe(0)
    expect(output).toContain('预览站 robots.txt 必须禁止全部抓取')
  }, 60_000)

  it('sitemap 中的地址缺少 basePath，或页面打不开时导出失败', async () => {
    workHtml = workPage(`${BASE}/api/media/file/hero-1050x1400.webp`)
    sitemap = sitemapXml([SITE, 'https://doraemonblogs.github.io/terms', `${SITE}/gone`])
    const { code, output } = await runExport(path.join(root, 'sitemap-bad'))
    expect(code).not.toBe(0)
    expect(output).toContain(
      'sitemap.xml 中的地址无效或缺少 basePath（/EduVerse）：https://doraemonblogs.github.io/terms',
    )
    // 给出修正方法：以预览站地址（含 basePath）构建
    expect(output).toContain(`NEXT_PUBLIC_SITE_URL=${origin}${BASE} pnpm preview:build`)
    expect(output).toContain(`页面返回 404：${origin}${BASE}/gone`)
  }, 60_000)
})

describe('静态预览站导出脚本：断链与分享图', () => {
  it('计划路由清单为空：链接到 404 页面即导出失败', async () => {
    workHtml = workPage(`${BASE}/api/media/file/hero-1050x1400.webp`)
    homeHtml = page('', `<a href="${BASE}/works/1">作品</a><a href="${BASE}/careers">就业</a>`)
    const { code, output } = await runExport(path.join(root, 'broken-link'))
    expect(code).not.toBe(0)
    expect(output).toContain(`页面返回 404：${origin}${BASE}/careers`)
    expect(output).toContain('断链：index.html 链接到未导出的页面 /careers')
  }, 60_000)

  it('内置分享图（构建产物）必须带 basePath 且存在于输出目录', async () => {
    workHtml = workPage(`${BASE}/api/media/file/hero-1050x1400.webp`)
    homeHtml = page(
      `<meta property="og:image" content="${SITE}/_next/static/media/share.png"/>`,
      `<a href="${BASE}/works/1">作品</a>`,
    )
    const ok = await runExport(path.join(root, 'share-ok'))
    expect(ok.output).toContain('导出完成，未发现断链')
    expect(ok.code).toBe(0)

    homeHtml = page(
      [
        `<meta property="og:image" content="https://doraemonblogs.github.io/_next/static/media/share.png"/>`,
        `<meta name="twitter:image" content="${SITE}/_next/static/media/missing.png"/>`,
      ].join(''),
      `<a href="${BASE}/works/1">作品</a>`,
    )
    const bad = await runExport(path.join(root, 'share-bad'))
    expect(bad.code).not.toBe(0)
    expect(bad.output).toContain(
      '分享图缺少 basePath（/EduVerse）：index.html 引用了 /_next/static/media/share.png',
    )
    expect(bad.output).toContain('缺少资源：index.html 引用了 /_next/static/media/missing.png')
  }, 60_000)
})
