import { describe, expect, it } from 'vitest'

import { lexicalToPlainText, truncateText } from '@/lib/lexical-text'

type Node = Record<string, unknown>

const text = (value: string): Node => ({ type: 'text', text: value, format: 0, version: 1 })
const paragraph = (...children: Node[]): Node => ({ type: 'paragraph', children, version: 1 })
const heading = (tag: string, ...children: Node[]): Node => ({
  type: 'heading',
  tag,
  children,
  version: 1,
})
const listItem = (...children: Node[]): Node => ({ type: 'listitem', children, version: 1 })
const list = (...items: Node[]): Node => ({ type: 'list', listType: 'bullet', children: items })
const doc = (...children: Node[]) => ({ root: { type: 'root', children, version: 1 } })

describe('lexicalToPlainText', () => {
  it('段落之间用换行分隔，同一段落内的文本节点直接拼接', () => {
    const value = doc(
      paragraph(text('学习 '), text('三维动画'), text('，从建模开始。')),
      paragraph(text('第二段')),
    )
    expect(lexicalToPlainText(value)).toBe('学习 三维动画，从建模开始。\n第二段')
  })

  it('标题与引用按块级节点换行', () => {
    const value = doc(heading('h2', text('课程介绍')), paragraph(text('正文内容')), {
      type: 'quote',
      children: [text('一段引用')],
    })
    expect(lexicalToPlainText(value)).toBe('课程介绍\n正文内容\n一段引用')
  })

  it('嵌套列表的每个列表项各占一行', () => {
    const value = doc(
      list(
        listItem(text('建模')),
        listItem(list(listItem(text('硬表面')), listItem(text('角色')))),
        listItem(text('渲染')),
      ),
    )
    expect(lexicalToPlainText(value)).toBe('建模\n硬表面\n角色\n渲染')
  })

  it('链接等行内节点中的文字会被保留', () => {
    const value = doc(
      paragraph(text('详见'), {
        type: 'link',
        fields: { url: '/courses' },
        children: [text('课程页')],
      }),
    )
    expect(lexicalToPlainText(value)).toBe('详见课程页')
  })

  it('软换行转为换行，多余空白与空段落被合并', () => {
    const value = doc(
      paragraph(text('  第一行  '), { type: 'linebreak' }, text('第二行\t\t末尾')),
      paragraph(),
      paragraph(text('　全角空格　')),
    )
    expect(lexicalToPlainText(value)).toBe('第一行\n第二行 末尾\n全角空格')
  })

  it('忽略没有文本的节点（图片、自定义区块）', () => {
    const value = doc(
      paragraph(text('前')),
      { type: 'upload', relationTo: 'media', value: 1 },
      { type: 'block', fields: { blockType: 'cta' } },
      paragraph(text('后')),
    )
    expect(lexicalToPlainText(value)).toBe('前\n后')
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['字符串', '{"root":{}}'],
    ['数字', 42],
    ['数组', [paragraph(text('x'))]],
    ['缺少 root', { children: [] }],
    ['root 不是对象', { root: 'oops' }],
    ['children 不是数组', { root: { children: 'oops' } }],
  ])('无效输入（%s）返回空字符串', (_label, value) => {
    expect(lexicalToPlainText(value)).toBe('')
  })

  it('忽略结构异常的子节点', () => {
    const value = doc(
      paragraph(text('有效'), { type: 'text', text: 123 } as Node, null as unknown as Node),
      'oops' as unknown as Node,
    )
    expect(lexicalToPlainText(value)).toBe('有效')
  })

  it('空文档返回空字符串', () => {
    expect(lexicalToPlainText(doc())).toBe('')
    expect(lexicalToPlainText(doc(paragraph()))).toBe('')
  })

  it('超过 maxLength 时截断', () => {
    const value = doc(paragraph(text('一二三四五六七八九十')))
    expect(lexicalToPlainText(value, 4)).toBe('一二三四')
    expect(lexicalToPlainText(value, 100)).toBe('一二三四五六七八九十')
  })

  it('默认最多保留 5000 个字符', () => {
    const value = doc(paragraph(text('字'.repeat(6000))))
    expect(lexicalToPlainText(value)).toHaveLength(5000)
  })

  it('截断不会把 emoji 截成半个', () => {
    const value = doc(paragraph(text('🎨🎬🎮')))
    expect(lexicalToPlainText(value, 2)).toBe('🎨🎬')
  })

  it('maxLength 不是正数时返回空字符串', () => {
    const value = doc(paragraph(text('内容')))
    expect(lexicalToPlainText(value, 0)).toBe('')
    expect(lexicalToPlainText(value, -1)).toBe('')
    expect(lexicalToPlainText(value, Number.NaN)).toBe('')
  })

  it('嵌套过深的异常数据不会导致栈溢出', () => {
    let node: Node = text('深处')
    for (let i = 0; i < 10_000; i++) node = { type: 'link', children: [node] }
    expect(() => lexicalToPlainText(doc(paragraph(text('表层')), node))).not.toThrow()
  })
})

describe('truncateText', () => {
  it('未超长时原样返回', () => {
    expect(truncateText('标题', 10)).toBe('标题')
  })

  it('截断后去掉末尾空白', () => {
    expect(truncateText('标题\n正文', 3)).toBe('标题')
  })
})
