import { describe, expect, it } from 'vitest'

import { assignSectionTones, summarizeMajor } from '@/components/course/major/major-layout'
import { shiftRichTextHeadings } from '@/components/course/major/rich-text-headings'

import { BEIJING, campusRef, courseCard, SHANGHAI } from '../helpers/course-fixtures'

/**
 * 专业方向页的纯函数：首屏概况汇总、区块底色、专业介绍标题降级。
 */

describe('summarizeMajor', () => {
  it('汇总课程数、班型（长期在前）、授课方式（固定顺序）与去重排序后的开设校区', () => {
    const summary = summarizeMajor([
      courseCard({ id: 1, classType: 'short_term', deliveryModes: ['dual'], campuses: [SHANGHAI] }),
      courseCard({
        id: 2,
        classType: 'long_term',
        deliveryModes: ['online', 'offline'],
        campuses: [SHANGHAI, BEIJING],
      }),
      courseCard({ id: 3, classType: 'short_term', deliveryModes: ['online'], campuses: [] }),
    ])
    expect(summary.courseCount).toBe(3)
    expect(summary.classTypes).toEqual(['long_term', 'short_term'])
    expect(summary.deliveryModes).toEqual(['offline', 'online', 'dual'])
    expect(summary.campuses.map((c) => c.id)).toEqual([BEIJING.id, SHANGHAI.id])
  })

  it('校区按后台排序排列，排序相同按 ID', () => {
    const a = campusRef({ id: 9, order: 1 })
    const b = campusRef({ id: 4, order: 1 })
    const c = campusRef({ id: 7, order: 0 })
    const summary = summarizeMajor([courseCard({ campuses: [a, b, c] })])
    expect(summary.campuses.map((campus) => campus.id)).toEqual([7, 4, 9])
  })

  it('没有课程时各项为空', () => {
    expect(summarizeMajor([])).toEqual({
      courseCount: 0,
      classTypes: [],
      deliveryModes: [],
      campuses: [],
    })
  })
})

describe('assignSectionTones', () => {
  it('首屏之后从白底开始，浅色区块白底 / 米色交替，作品区块固定深色', () => {
    const tones = assignSectionTones(['intro', 'careers', 'courses', 'works', 'teachers'])
    expect([...tones.entries()]).toEqual([
      ['intro', 'light'],
      ['careers', 'paper'],
      ['courses', 'light'],
      ['works', 'dark'],
      ['teachers', 'light'],
    ])
  })

  it('中间缺少区块时，相邻两个浅色区块仍然底色不同', () => {
    const tones = assignSectionTones(['intro', 'courses', 'teachers'])
    expect(tones.get('intro')).toBe('light')
    expect(tones.get('courses')).toBe('paper')
    expect(tones.get('teachers')).toBe('light')
  })

  it('只有课程区块时为白底', () => {
    expect(assignSectionTones(['courses']).get('courses')).toBe('light')
  })
})

/** 构造最小的 Lexical 文档：标题与段落 */
function heading(tag: string, text: string) {
  return { type: 'heading', tag, version: 1, children: [{ type: 'text', text, version: 1 }] }
}
function doc(...children: Record<string, unknown>[]) {
  return { root: { type: 'root', version: 1, children } }
}

function tags(data: ReturnType<typeof doc>): string[] {
  return data.root.children.flatMap((node) => (typeof node.tag === 'string' ? [node.tag] : []))
}

describe('shiftRichTextHeadings', () => {
  it('最高一级标题降到 h3，其余按相对层级整体下移', () => {
    const data = doc(heading('h2', '是什么'), heading('h3', '细分'), heading('h2', '学什么'))
    expect(tags(shiftRichTextHeadings(data))).toEqual(['h3', 'h4', 'h3'])
  })

  it('h1 起始时同样降到 h3，最多降到 h6', () => {
    const data = doc(heading('h1', 'a'), heading('h4', 'b'), heading('h6', 'c'))
    expect(tags(shiftRichTextHeadings(data))).toEqual(['h3', 'h6', 'h6'])
  })

  it('最高一级已不高于 h3、或没有标题时原样返回', () => {
    const low = doc(heading('h3', 'a'), heading('h4', 'b'))
    expect(shiftRichTextHeadings(low)).toBe(low)
    const plain = doc({ type: 'paragraph', version: 1, children: [] })
    expect(shiftRichTextHeadings(plain)).toBe(plain)
  })

  it('不修改传入的数据', () => {
    const data = doc(heading('h2', '是什么'))
    const shifted = shiftRichTextHeadings(data)
    expect(tags(data)).toEqual(['h2'])
    expect(shifted).not.toBe(data)
  })

  it('嵌套在其它节点里的标题也会降级；不进入链接等节点里填充的文档', () => {
    const data = doc({
      type: 'list',
      version: 1,
      children: [heading('h2', '嵌套')],
      fields: { doc: { value: { type: 'heading', tag: 'h2' } } },
    })
    const shifted = shiftRichTextHeadings(data)
    const list = shifted.root.children[0] as { children: { tag: string }[]; fields: unknown }
    expect(list.children[0]?.tag).toBe('h3')
    expect(list.fields).toEqual({ doc: { value: { type: 'heading', tag: 'h2' } } })
  })
})
