import { getPayload, type Payload } from 'payload'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

import { generatePlaceholder } from '../../scripts/seed/placeholders'

/**
 * 富文本里的课程链接（集成）：专业方向下线后，它下面的课程详情返回 404，
 * 其它专业方向介绍、通用页面里指向这些课程的链接也要随之只渲染文字（关联节点不渲染）。
 * 真实 Payload + 测试库，直接调用查询函数（不经过 Next 缓存），再用 RichText 渲染成 HTML 断言。
 * 测试数据统一用 rtl-int 前缀，开始前与结束后都会清理。
 */
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  revalidateTag: vi.fn(),
}))
// next/link 依赖 Next 路由上下文：这里只关心输出的地址
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement('a', { href }, children),
}))

const { queryCourseDetail, queryDisciplineDetail } = await import('@/lib/data/courses')
const { queryPageBySlug } = await import('@/lib/data/pages')
const { RichText } = await import('@/components/common/rich-text')

const PREFIX = 'rtl-int'
const LIVE_LINK_TEXT = '同方向的课程'
const ORPHAN_LINK_TEXT = '另一个方向的课程'

let payload: Payload
const ids = { media: 0, hostDiscipline: 0, linkedDiscipline: 0, liveCourse: 0, orphanCourse: 0 }

const base = { direction: 'ltr' as const, format: '' as const, indent: 0, version: 1 }

const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const internalLink = (courseId: number, label: string) => ({
  ...base,
  type: 'link',
  version: 3,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo: 'courses', value: courseId } },
  children: [text(label)],
})

/** 富文本：正文里两个站内链接（同方向课程、另一方向课程）+ 另一方向课程的关联节点 */
function courseLinks() {
  return {
    root: {
      ...base,
      type: 'root',
      children: [
        {
          ...base,
          type: 'paragraph',
          textFormat: 0,
          textStyle: '',
          children: [
            text('推荐阅读：'),
            internalLink(ids.liveCourse, LIVE_LINK_TEXT),
            text('、'),
            internalLink(ids.orphanCourse, ORPHAN_LINK_TEXT),
          ],
        },
        {
          type: 'relationship',
          version: 2,
          format: '',
          relationTo: 'courses',
          value: ids.orphanCourse,
        },
      ],
    },
  }
}

const render = (data: Parameters<typeof RichText>[0]['data']) =>
  renderToStaticMarkup(createElement(RichText, { data }))

async function renderedIntro(): Promise<string> {
  const detail = await queryDisciplineDetail(payload, `${PREFIX}-host`)
  expect(detail).not.toBeNull()
  return render(detail?.intro)
}

async function renderedPage(): Promise<string> {
  const page = await queryPageBySlug(payload, `${PREFIX}-page`)
  expect(page).not.toBeNull()
  return (page?.layout ?? [])
    .map((block) => (block.blockType === 'richText' ? render(block.content) : ''))
    .join('')
}

async function cleanup() {
  const like = { like: PREFIX }
  await payload.delete({ collection: 'pages', where: { slug: like } })
  await payload.delete({ collection: 'courses', where: { slug: like } })
  await payload.delete({ collection: 'disciplines', where: { slug: like } })
  await payload.delete({ collection: 'media', where: { alt: like } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()

  const image = await generatePlaceholder(
    { kind: 'art', seed: PREFIX, hue: 120, aspect: '16:9', label: '测试', size: 64 },
    `seed-${PREFIX}`,
  )
  ids.media = (
    await payload.create({
      collection: 'media',
      data: { alt: `${PREFIX} 封面` },
      file: {
        data: image.data,
        mimetype: image.mimetype,
        name: image.filename,
        size: image.data.length,
      },
    })
  ).id

  const discipline = (suffix: string, order: number) => ({
    name: `链接测试方向 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    cover: ids.media,
    order,
    _status: 'published' as const,
  })
  ids.hostDiscipline = (
    await payload.create({ collection: 'disciplines', data: discipline('host', 950) })
  ).id
  ids.linkedDiscipline = (
    await payload.create({ collection: 'disciplines', data: discipline('linked', 951) })
  ).id

  const course = (suffix: string, disciplineId: number) => ({
    title: `链接测试课程 ${suffix}`,
    slug: `${PREFIX}-${suffix}`,
    discipline: disciplineId,
    classType: 'short_term' as const,
    deliveryModes: ['online' as const],
    duration: { value: 2, unit: 'month' as const },
    summary: '集成测试课程',
    cover: ids.media,
    _status: 'published' as const,
  })
  ids.liveCourse = (
    await payload.create({ collection: 'courses', data: course('live', ids.hostDiscipline) })
  ).id
  ids.orphanCourse = (
    await payload.create({ collection: 'courses', data: course('orphan', ids.linkedDiscipline) })
  ).id

  // 富文本要引用课程 ID：课程建好后再写入专业介绍，并新建引用它们的通用页面
  await payload.update({
    collection: 'disciplines',
    id: ids.hostDiscipline,
    data: { intro: courseLinks() },
  })
  await payload.create({
    collection: 'pages',
    data: {
      title: '链接测试页',
      slug: `${PREFIX}-page`,
      layout: [{ blockType: 'richText', content: courseLinks() }],
      _status: 'published',
    },
  })
}, 120_000)

afterAll(async () => {
  if (payload) await cleanup()
  await payload?.db.destroy?.()
})

describe('富文本里的课程链接（集成）', () => {
  it('课程与所属专业方向都已发布时，专业介绍与通用页面输出课程链接', async () => {
    for (const html of [await renderedIntro(), await renderedPage()]) {
      expect(html).toContain(`href="/courses/${PREFIX}-live"`)
      expect(html).toContain(`href="/courses/${PREFIX}-orphan"`)
      // 关联节点输出课程标题链接
      expect(html).toContain('链接测试课程 orphan')
    }
  })

  it('专业方向下线后，它下面课程的链接只剩文字，关联节点不再输出', async () => {
    await payload.update({
      collection: 'disciplines',
      id: ids.linkedDiscipline,
      data: { _status: 'draft' },
    })
    // 与课程详情的规则一致：该课程已 404
    expect(await queryCourseDetail(payload, `${PREFIX}-orphan`)).toBeNull()

    for (const html of [await renderedIntro(), await renderedPage()]) {
      expect(html).not.toContain(`/courses/${PREFIX}-orphan`)
      expect(html).toContain(ORPHAN_LINK_TEXT)
      expect(html).not.toContain('链接测试课程 orphan')
      // 同一段富文本里仍可访问的课程不受影响
      expect(html).toContain(`href="/courses/${PREFIX}-live"`)
    }
  })
})
