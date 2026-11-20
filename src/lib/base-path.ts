/**
 * 子路径部署（GitHub Pages 预览站 /EduVerse）时给站内绝对路径补上 basePath。
 * next/link 会自动处理；next/image 的字符串 src、后台媒体 URL、手写的 <a href> 需要用它。
 * withPayload 会把 next.config 的 basePath 写入 NEXT_BASE_PATH 并注入客户端，正式站为空。
 */
export const BASE_PATH = (process.env.NEXT_BASE_PATH ?? '').replace(/\/+$/, '')

export function withBasePath(path: string, basePath: string = BASE_PATH): string {
  if (!basePath || !path.startsWith('/') || path.startsWith('//')) return path
  if (path === basePath || path.startsWith(`${basePath}/`)) return path
  return `${basePath}${path}`
}
