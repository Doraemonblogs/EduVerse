import { revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

/** 缓存标签约定：前台数据层（src/lib/data）按这些标签缓存查询结果 */
export const cacheTags = {
  collection: (slug: string) => `collection:${slug}`,
  doc: (slug: string, id: number | string) => `doc:${slug}:${id}`,
  global: (slug: string) => `global:${slug}`,
}

/**
 * 内容变更后让前台缓存失效。
 * 种子脚本、集成测试等 Next 运行时之外的调用自动跳过（也可显式传 context.disableRevalidate=true）；
 * 万一在 Next 请求上下文之外被调用（revalidateTag 会抛错），只记录警告，不影响保存。
 */
function safeRevalidate(req: PayloadRequest, tags: string[]) {
  // 不在 Next 服务端运行时中（种子脚本、集成测试）：没有可失效的缓存，直接跳过
  if (req.context?.disableRevalidate || !process.env.NEXT_RUNTIME) return
  for (const tag of tags) {
    try {
      revalidateTag(tag, 'max')
    } catch (err) {
      req.payload.logger.warn({ err, tag }, '缓存失效失败（可能不在 Next 运行时中）')
    }
  }
}

export function revalidateCollection(slug: string): {
  afterChange: CollectionAfterChangeHook[]
  afterDelete: CollectionAfterDeleteHook[]
} {
  return {
    afterChange: [
      ({ doc, req }) => {
        safeRevalidate(req, [cacheTags.collection(slug), cacheTags.doc(slug, doc.id)])
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req }) => {
        safeRevalidate(req, [cacheTags.collection(slug), cacheTags.doc(slug, doc.id)])
        return doc
      },
    ],
  }
}

export function revalidateGlobal(slug: string): GlobalAfterChangeHook[] {
  return [
    ({ doc, req }) => {
      safeRevalidate(req, [cacheTags.global(slug)])
      return doc
    },
  ]
}
