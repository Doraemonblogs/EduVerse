import { z } from 'zod'

/**
 * 读取页面查询参数的公共工具（纯函数，列表页的筛选 / 分页解析共用）。
 */

/**
 * slug 类参数（专业方向、软件、城市标识）的校验：与后台 slug 字段格式一致。
 * 不引入 src/lib/slugify.ts（它依赖服务端的拼音库）。
 */
export const slugParam = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

/** Next 页面的 searchParams（await 之后的对象）或 URLSearchParams */
export type SearchParamsInput =
  URLSearchParams | Readonly<Record<string, string | readonly string[] | undefined>>

/** 读取一个参数：不存在返回 undefined；重复出现时取第一个 */
export function readSearchParam(input: SearchParamsInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) return input.has(key) ? (input.get(key) ?? '') : undefined
  const value = input[key]
  if (value === undefined) return undefined
  return typeof value === 'string' ? value : (value[0] ?? '')
}

/** 是否为合法的 slug（与 slugParam 相同的规则）；详情页参数不合法时直接 404，不查库 */
export function isValidSlug(value: string): boolean {
  return slugParam.safeParse(value).success
}
