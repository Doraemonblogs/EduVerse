/**
 * 本地查看导出的静态预览站，模拟 GitHub Pages 的路径解析：
 *   /a → a（文件）→ a.html → a/index.html；都不存在时返回 404.html（状态码 404）。
 * 用法：pnpm preview:serve [--dir preview-dist] [--base-path /EduVerse] [--port 4173]
 */
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'preview-dist' },
    'base-path': { type: 'string', default: process.env.NEXT_BASE_PATH ?? '/EduVerse' },
    port: { type: 'string', default: '4173' },
  },
})

const root = path.resolve(values.dir!)
const basePath = values['base-path']!.replace(/\/+$/, '')
const port = Number(values.port)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function isFile(file: string) {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

async function resolveFile(urlPath: string): Promise<string | null> {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '')
  const base = path.join(root, rel)
  if (base !== root && !base.startsWith(root + path.sep)) return null
  const candidates =
    rel === ''
      ? [path.join(root, 'index.html')]
      : [base, `${base}.html`, path.join(base, 'index.html')]
  for (const file of candidates) if (await isFile(file)) return file
  return null
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    res.writeHead(302, { location: `${basePath}/` }).end()
    return
  }
  const file = await resolveFile(pathname.slice(basePath.length))
  const target = file ?? path.join(root, '404.html')
  const body = await readFile(target).catch(() => Buffer.from('Not Found'))
  res
    .writeHead(file ? 200 : 404, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
    })
    .end(body)
}).listen(port, () => {
  console.info(`静态预览站：http://localhost:${port}${basePath}/`)
})
