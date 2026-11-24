import { type JsonLdData } from '@/lib/seo/json-ld'
import { TUTORIALS_PATH } from '@/lib/tutorials/paths'
import type { TutorialCardData, TutorialPagesSettings } from '@/lib/tutorials/types'

/**
 * 免费教程列表页 /tutorials 的纯函数：元数据输入、VideoObject 结构化数据、时长格式转换。
 */

/** 交给 buildMetadata 的参数（不含站点设置，便于单元测试） */
export type TutorialsMetadataInput = {
  seo: TutorialPagesSettings['list']['seo'] | null
  title: string
  description: string | null
  shareImage: TutorialCardData['shareImage']
  path: string
}

/**
 * 列表页的元数据输入：
 * - 普通列表（含筛选）：教程页面设置的 SEO → 列表标题 / 简介；
 * - 深链接 `?play=<id>` 指向已发布的教程：标题、描述、分享图换成这个教程的（分享到微信时显示教程名），
 *   不用列表页的 SEO 标题 / 描述 / 分享图（只保留关键词）。
 * canonical 一律是 /tutorials；带筛选或 play 参数时由页面另加 `noindex, follow`。
 */
export function tutorialsMetadataInput(
  list: TutorialPagesSettings['list'],
  playTarget: TutorialCardData | null,
): TutorialsMetadataInput {
  if (!playTarget) {
    return {
      seo: list.seo,
      title: list.title,
      description: list.description,
      shareImage: null,
      path: TUTORIALS_PATH,
    }
  }
  return {
    seo: list.seo?.keywords ? { keywords: list.seo.keywords } : null,
    title: playTarget.title,
    description: playTarget.description ?? list.description,
    shareImage: playTarget.shareImage,
    path: TUTORIALS_PATH,
  }
}

/**
 * 后台填写的时长文字 → ISO 8601 时长（schema.org duration）：
 * “18:40” → PT18M40S，“1:02:03” → PT1H2M3S；格式不对或为 0 时返回 undefined（不输出）。
 */
export function tutorialIsoDuration(text: string | null): string | undefined {
  const value = text?.trim() ?? ''
  const short = /^(\d{1,3}):([0-5]\d)$/.exec(value)
  const long = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(value)
  let hours = 0
  let minutes = 0
  let seconds = 0
  if (long) {
    hours = Number(long[1])
    minutes = Number(long[2])
    seconds = Number(long[3])
  } else if (short) {
    minutes = Number(short[1])
    seconds = Number(short[2])
  } else {
    return undefined
  }
  if (hours + minutes + seconds === 0) return undefined
  const parts = [
    hours ? `${hours}H` : '',
    minutes ? `${minutes}M` : '',
    seconds ? `${seconds}S` : '',
  ].join('')
  return `PT${parts}`
}

/**
 * 教程的 VideoObject 结构化数据（配合 <JsonLd data={...} /> 输出）：
 * 只给不需要留资、且播放器地址可用的教程（留资解锁的教程不标注为可直接观看的视频）。
 * - thumbnailUrl：封面绝对地址（媒体地址已带 basePath，用 URL 解析替换站点地址的路径部分，不会重复子路径）；
 * - embedUrl：白名单内的播放器地址；duration：能解析时输出；
 * - uploadDate：教程收录到本站的时间（addedAt，后台创建时间，ISO 8601）。schema.org 对 uploadDate 的定义是
 *   “上传到本站的时间”，与之相符；它也是搜索引擎视频结构化数据的必填项，缺少时整条 VideoObject 无效。
 * 站点地址由调用方传入（getSiteUrl()），便于测试。
 */
export function tutorialVideoJsonLd(
  tutorials: readonly TutorialCardData[],
  siteUrl: string,
): JsonLdData[] {
  return tutorials
    .filter((tutorial) => !tutorial.gated && tutorial.embedUrl)
    .map((tutorial) =>
      compact({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: tutorial.title,
        description: tutorial.description ?? tutorial.title,
        thumbnailUrl: tutorial.cover ? new URL(tutorial.cover.src, `${siteUrl}/`).href : undefined,
        uploadDate: tutorial.addedAt || undefined,
        embedUrl: tutorial.embedUrl ?? undefined,
        duration: tutorialIsoDuration(tutorial.duration),
        genre: tutorial.discipline?.name,
        inLanguage: 'zh-CN',
        isAccessibleForFree: true,
      }),
    )
}

/** 去掉值为 undefined 的键，输出更干净的 JSON */
function compact(data: Record<string, unknown>): JsonLdData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}
