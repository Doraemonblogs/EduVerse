import { describe, expect, it } from 'vitest'

import { docHref } from '@/components/common/rich-text'
import { collectLinkedCourseIds, hideUnreachableCourses } from '@/lib/course/rich-text-guard'

/**
 * 富文本课程链接守卫（纯函数部分）：收集富文本引用的课程，把不可访问的标记为草稿。
 * 查询部分（guardCourseLinks）见 tests/unit/course-data.test.ts，真实数据见
 * tests/int/rich-text-course-links.int.spec.ts。
 */

type Doc = { id: number; slug: string; title: string; _status: 'published' | 'draft' }

const course = (id: number, slug: string): Doc => ({
  id,
  slug,
  title: `课程 ${id}`,
  _status: 'published',
})

const text = (value: string) => ({ type: 'text', text: value, version: 1, format: 0 })

const internalLink = (relationTo: string, value: unknown, label = '查看课程') => ({
  type: 'link',
  version: 3,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo, value } },
  children: [text(label)],
})

const relationship = (relationTo: string, value: unknown) => ({
  type: 'relationship',
  version: 2,
  format: '',
  relationTo,
  value,
})

const paragraph = (...children: unknown[]) => ({ type: 'paragraph', version: 1, children })

const richText = (...children: unknown[]) => ({
  root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children },
})

const reachable = course(1, 'reachable-course')
const unreachable = course(2, 'orphan-course')

/** 嵌套在列表里的链接、正文里的链接、关联节点，外加不该被处理的引用 */
const intro = richText(
  paragraph(text('先看看'), internalLink('courses', reachable)),
  {
    type: 'list',
    version: 1,
    children: [
      {
        type: 'listitem',
        version: 1,
        children: [internalLink('courses', unreachable, '已下线方向的课程')],
      },
    ],
  },
  relationship('courses', unreachable),
  // 未填充的课程（只有 ID）本来就不输出链接，不需要查询
  paragraph(internalLink('courses', 9)),
  // 其它集合、自定义链接不处理
  paragraph(internalLink('disciplines', { id: 2, slug: 'game-art', _status: 'published' })),
  paragraph({
    type: 'link',
    version: 3,
    fields: { linkType: 'custom', url: 'https://example.cn' },
    children: [text('外链')],
  }),
)

/** 取出所有指向课程的引用值（链接的 fields.doc.value 与关联节点的 value） */
function courseRefs(value: unknown): unknown[] {
  const refs: unknown[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.relationTo === 'courses' && 'value' in record) refs.push(record.value)
    Object.values(record).forEach(walk)
  }
  walk(value)
  return refs
}

describe('collectLinkedCourseIds', () => {
  it('收集站内链接与关联节点里已填充的课程（含嵌套列表），去重', () => {
    expect(collectLinkedCourseIds(intro).sort()).toEqual([1, 2])
  })

  it('不收集未填充的课程、其它集合与自定义链接', () => {
    const others = richText(
      paragraph(internalLink('courses', 9)),
      paragraph(internalLink('teachers', { id: 3, slug: 'li-ming' })),
      relationship('works', { id: 4 }),
    )
    expect(collectLinkedCourseIds(others)).toEqual([])
    expect(collectLinkedCourseIds(null)).toEqual([])
    expect(collectLinkedCourseIds(undefined)).toEqual([])
  })

  it('能在含富文本的结构（页面区块数组）里找到每段富文本', () => {
    const layout = [
      { blockType: 'richText', content: richText(paragraph(internalLink('courses', reachable))) },
      { blockType: 'stats', items: [{ value: '12', label: '年' }] },
      {
        blockType: 'imageText',
        image: { id: 5, url: '/api/media/file/a.webp' },
        content: richText(relationship('courses', unreachable)),
      },
    ]
    expect(collectLinkedCourseIds(layout).sort()).toEqual([1, 2])
  })

  it('不进入已填充的课程文档内部（课程自己的富文本不会渲染）', () => {
    const nested = { ...course(3, 'nested'), intro: richText(internalLink('courses', unreachable)) }
    expect(collectLinkedCourseIds(richText(paragraph(internalLink('courses', nested))))).toEqual([
      3,
    ])
  })
})

describe('hideUnreachableCourses', () => {
  it('不可访问的课程标记为草稿：链接只渲染文字，可访问的课程保持链接', () => {
    const guarded = hideUnreachableCourses(intro, new Set([1]))
    const refs = courseRefs(guarded)
    const hrefs = refs.map((value) => docHref('courses', value))
    expect(hrefs).toEqual(['/courses/reachable-course', null, null, null])
    // 链接文字仍保留（RichTextLink 只去掉 <a>）
    expect(JSON.stringify(guarded)).toContain('已下线方向的课程')
  })

  it('不修改传入的富文本', () => {
    const before = JSON.stringify(intro)
    hideUnreachableCourses(intro, new Set([1]))
    expect(JSON.stringify(intro)).toBe(before)
    expect(courseRefs(intro).map((value) => docHref('courses', value))).toEqual([
      '/courses/reachable-course',
      '/courses/orphan-course',
      '/courses/orphan-course',
      null,
    ])
  })

  it('全部可访问时原样返回（同一个对象）', () => {
    expect(hideUnreachableCourses(intro, new Set([1, 2]))).toBe(intro)
    expect(hideUnreachableCourses(null, new Set())).toBeNull()
  })

  it('页面区块数组：只标记不可访问的课程，其它字段不变', () => {
    const layout = [
      { blockType: 'richText', content: richText(paragraph(internalLink('courses', reachable))) },
      { blockType: 'imageText', content: richText(relationship('courses', unreachable)) },
    ]
    const guarded = hideUnreachableCourses(layout, new Set([1]))
    expect(guarded).not.toBe(layout)
    expect(guarded.map((block) => block.blockType)).toEqual(['richText', 'imageText'])
    expect(courseRefs(guarded[0])).toEqual([reachable])
    expect(courseRefs(guarded[1])).toEqual([{ ...unreachable, _status: 'draft' }])
  })
})
