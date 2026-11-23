import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * 静态预览站导出脚本（scripts/preview/export-static.ts）：对一个模拟的生产服务（basePath /EduVerse）
 * 运行真实脚本，验证只出现在 RSC 数据 / <meta content> 里的媒体文件会被导出并参与断链校验。
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

let server: Server
let origin = ''
let workHtml = ''
let root = ''

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'preview-export-'))
  // 脚本会整体复制构建产物目录，给一个最小的 .next/static
  await mkdir(path.join(root, 'next', 'static', 'chunks'), { recursive: true })
  await writeFile(path.join(root, 'next', 'static', 'chunks', 'main.js'), '')

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

    if (url.pathname === BASE) {
      return html(200, page('', `<a href="${BASE}/works/1">作品</a>`))
    }
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
