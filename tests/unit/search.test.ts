import { describe, expect, it } from 'vitest'

import { zh } from '@/i18n/zh'
import {
  buildExcerpt,
  EXCERPT_LENGTH,
  firstMatchIndex,
  splitHighlight,
} from '@/lib/search/highlight'
import {
  rankHits,
  SEARCH_GROUP_LIMIT,
  toArticleHit,
  toCourseHit,
  toDisciplineHit,
  toTeacherHit,
  toWorkHit,
  type ArticleHitSource,
} from '@/lib/search/mappers'
import {
  escapeLikeTerm,
  normalizeSearchQuery,
  parseSearchQuery,
  SEARCH_PARAM,
  SEARCH_QUERY_MAX,
  SEARCH_TERMS_MAX,
  searchCacheKey,
  searchQuerySchema,
  searchTerms,
} from '@/lib/search/query'
import { SEARCH_GROUP_KEYS, type SearchHit } from '@/lib/search/types'
import type { Discipline, Media } from '@/payload-types'

describe('搜索关键词的规范化与校验', () => {
  it('去掉首尾空白，合并连续空白；全角字母数字与全角空格转半角；控制字符当作空格', () => {
    expect(normalizeSearchQuery('  Blender   入门 ')).toBe('Blender 入门')
    expect(normalizeSearchQuery('ＵＩ　设计')).toBe('UI 设计')
    expect(normalizeSearchQuery('a\tb\nc\u0000d')).toBe('a b c d')
    expect(normalizeSearchQuery(' \u3000 ')).toBe('')
  })

  it('规范化后长度须为 1–50', () => {
    expect(searchQuerySchema.safeParse('  三维动画 ').data).toBe('三维动画')
    expect(searchQuerySchema.safeParse('a'.repeat(SEARCH_QUERY_MAX)).success).toBe(true)
    expect(searchQuerySchema.safeParse(`  ${'a'.repeat(SEARCH_QUERY_MAX)}  `).success).toBe(true)
    expect(searchQuerySchema.safeParse('a'.repeat(SEARCH_QUERY_MAX + 1)).success).toBe(false)
    expect(searchQuerySchema.safeParse('').success).toBe(false)
    expect(searchQuerySchema.safeParse('   ').success).toBe(false)
    expect(searchQuerySchema.safeParse(42).success).toBe(false)
  })

  it('parseSearchQuery：缺失或只有空白为 empty，超长为 tooLong（回填截断后的关键词），合法时给出检索词', () => {
    expect(SEARCH_PARAM).toBe('q')
    expect(parseSearchQuery({})).toEqual({ status: 'empty' })
    expect(parseSearchQuery({ q: '' })).toEqual({ status: 'empty' })
    expect(parseSearchQuery({ q: '  \u3000 ' })).toEqual({ status: 'empty' })
    expect(parseSearchQuery(new URLSearchParams('q='))).toEqual({ status: 'empty' })
    expect(parseSearchQuery(new URLSearchParams(''))).toEqual({ status: 'empty' })

    const long = '超'.repeat(SEARCH_QUERY_MAX + 10)
    expect(parseSearchQuery({ q: long })).toEqual({
      status: 'tooLong',
      value: '超'.repeat(SEARCH_QUERY_MAX),
    })

    expect(parseSearchQuery({ q: ' Blender  入门 ' })).toEqual({
      status: 'ok',
      query: 'Blender 入门',
      terms: ['Blender', '入门'],
    })
    // 重复出现时取第一个
    expect(parseSearchQuery({ q: ['UE5', 'Maya'] })).toMatchObject({ query: 'UE5' })
    expect(parseSearchQuery(new URLSearchParams('q=UE5&q=Maya'))).toMatchObject({ query: 'UE5' })
  })

  it('HTML / 脚本字符串按普通文字处理（不转义、不剔除，由 React 渲染时转义）', () => {
    expect(parseSearchQuery({ q: '<script>alert(1)</script>' })).toEqual({
      status: 'ok',
      query: '<script>alert(1)</script>',
      terms: ['<script>alert(1)</script>'],
    })
  })

  it('检索词：按空格拆分，忽略大小写去重，去掉被其它检索词包含的词，最多 5 个', () => {
    expect(searchTerms('Blender blender BLENDER')).toEqual(['Blender'])
    expect(searchTerms('ui UI设计')).toEqual(['UI设计'])
    expect(searchTerms('角色 角色绑定 动画')).toEqual(['角色绑定', '动画'])
    expect(searchTerms('a1 b2 c3 d4 e5 f6 g7')).toHaveLength(SEARCH_TERMS_MAX)
    expect(searchTerms('   ')).toEqual([])
  })

  it('缓存键：规范化后转小写（大小写、多余空白不同的关键词共用一份缓存）', () => {
    expect(searchCacheKey(' Blender  入门')).toBe('blender 入门')
    expect(searchCacheKey('BLENDER 入门')).toBe(searchCacheKey('blender 入门 '))
    expect(searchCacheKey('ＵＥ５')).toBe('ue5')
  })

  it('LIKE 通配符与转义符按字面匹配', () => {
    expect(escapeLikeTerm('100%')).toBe('100\\%')
    expect(escapeLikeTerm('a_b')).toBe('a\\_b')
    expect(escapeLikeTerm('C:\\path')).toBe('C:\\\\path')
    expect(escapeLikeTerm('普通文字')).toBe('普通文字')
  })
})

describe('搜索结果高亮', () => {
  it('把文本拆成片段，匹配片段 match 为 true；大小写不敏感，保留原文大小写', () => {
    expect(splitHighlight('Blender 入门与 blender 进阶', ['BLENDER'])).toEqual([
      { text: 'Blender', match: true },
      { text: ' 入门与 ', match: false },
      { text: 'blender', match: true },
      { text: ' 进阶', match: false },
    ])
  })

  it('多个检索词：长词优先，相邻的匹配合并为一个片段', () => {
    expect(splitHighlight('UI设计与UI规范', ['ui', 'ui设计'])).toEqual([
      { text: 'UI设计', match: true },
      { text: '与', match: false },
      { text: 'UI', match: true },
      { text: '规范', match: false },
    ])
    expect(splitHighlight('三维动画', ['三维', '动画'])).toEqual([
      { text: '三维动画', match: true },
    ])
  })

  it('正则特殊字符按字面匹配；没有检索词或没有匹配时返回整段；空文本返回空数组', () => {
    expect(splitHighlight('C++ (入门) [1]', ['c++', '(入门)'])).toEqual([
      { text: 'C++', match: true },
      { text: ' ', match: false },
      { text: '(入门)', match: true },
      { text: ' [1]', match: false },
    ])
    expect(splitHighlight('a.b', ['.'])).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
    ])
    expect(splitHighlight('三维动画', [])).toEqual([{ text: '三维动画', match: false }])
    expect(splitHighlight('三维动画', ['  '])).toEqual([{ text: '三维动画', match: false }])
    expect(splitHighlight('三维动画', ['游戏'])).toEqual([{ text: '三维动画', match: false }])
    expect(splitHighlight('', ['游戏'])).toEqual([])
  })

  it('HTML 字符串只是片段里的普通文字（不产生 HTML，片段拼回去等于原文）', () => {
    const text = '标题 <img src=x onerror=alert(1)> 与 <b>粗体</b>'
    const parts = splitHighlight(text, ['<img src=x onerror=alert(1)>'])
    expect(parts.map((part) => part.text).join('')).toBe(text)
    expect(parts).toContainEqual({ text: '<img src=x onerror=alert(1)>', match: true })
    for (const part of parts) expect(typeof part.text).toBe('string')
  })

  it('片段拼回去总是等于原文（含 emoji 与组合字符）', () => {
    const text = '🎨 角色设计 🎨 设计稿'
    expect(
      splitHighlight(text, ['设计'])
        .map((part) => part.text)
        .join(''),
    ).toBe(text)
  })

  it('firstMatchIndex：第一个匹配的位置，没有时为 -1', () => {
    expect(firstMatchIndex('学习 Maya 与 maya', ['MAYA'])).toBe(3)
    expect(firstMatchIndex('学习 Maya', ['Blender'])).toBe(-1)
    expect(firstMatchIndex('学习 Maya', [])).toBe(-1)
  })
})

describe('搜索结果摘要', () => {
  it('短文本原样返回（合并空白）；空文本返回 null', () => {
    expect(buildExcerpt('  一段  简短\n的说明 ', ['说明'])).toBe('一段 简短 的说明')
    expect(buildExcerpt('', ['a'])).toBeNull()
    expect(buildExcerpt(null, ['a'])).toBeNull()
    expect(buildExcerpt('   ', ['a'])).toBeNull()
  })

  it('长文本截取第一个匹配附近的一段，被截断的一端加省略号', () => {
    const text = `${'前'.repeat(100)}关键词${'后'.repeat(100)}`
    const excerpt = buildExcerpt(text, ['关键词']) ?? ''
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt).toContain('关键词')
    expect(Array.from(excerpt.replaceAll('…', ''))).toHaveLength(EXCERPT_LENGTH)
  })

  it('指定较短的摘要长度时，匹配仍在摘要里', () => {
    const text = `${'前'.repeat(100)}关键词${'后'.repeat(100)}`
    const excerpt = buildExcerpt(text, ['关键词'], 10) ?? ''
    expect(excerpt).toContain('关键词')
    expect(Array.from(excerpt.replaceAll('…', ''))).toHaveLength(10)
  })

  it('匹配在开头或没有匹配时取开头；匹配在末尾时取最后一段', () => {
    const text = `关键词${'字'.repeat(200)}`
    expect(buildExcerpt(text, ['关键词'])?.startsWith('关键词')).toBe(true)
    expect(buildExcerpt(text, ['没有'])?.startsWith('关键词')).toBe(true)
    const tail = `${'字'.repeat(200)}结尾词`
    const excerpt = buildExcerpt(tail, ['结尾词']) ?? ''
    expect(excerpt.endsWith('结尾词')).toBe(true)
    expect(excerpt.startsWith('…')).toBe(true)
  })

  it('按码点截取，不把 emoji 拆成半个字符', () => {
    const text = '😀'.repeat(200)
    const excerpt = buildExcerpt(text, []) ?? ''
    expect(excerpt).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})

describe('搜索结果映射', () => {
  const media = {
    id: 1,
    alt: '封面',
    url: '/api/media/file/a.webp',
    width: 1600,
    height: 900,
    sizes: { thumbnail: { url: '/api/media/file/a-400x300.webp', width: 400, height: 300 } },
  } as unknown as Media
  const thumb = { src: '/api/media/file/a-400x300.webp', alt: '封面', width: 400, height: 300 }
  const discipline = (status: 'draft' | 'published') =>
    ({ id: 3, name: '游戏美术', slug: 'game-art', _status: status }) as unknown as Discipline

  it('课程：链接到课程详情，补充信息是已发布的专业方向名称', () => {
    const hit = toCourseHit(
      {
        id: 1,
        title: '游戏原画就业班',
        slug: 'game-concept',
        summary: '从素描到角色原画。',
        cover: media,
        discipline: discipline('published'),
      },
      ['原画'],
    )
    expect(hit).toEqual({
      id: 1,
      title: '游戏原画就业班',
      href: '/courses/game-concept',
      excerpt: '从素描到角色原画。',
      meta: '游戏美术',
      image: thumb,
    })
    expect(
      toCourseHit(
        { id: 1, title: 'x', slug: 'x', summary: '  ', cover: 1, discipline: discipline('draft') },
        [],
      ),
    ).toMatchObject({ meta: null, excerpt: null, image: null })
  })

  it('专业方向：链接到方向页，摘要是 tagline', () => {
    expect(
      toDisciplineHit(
        { id: 3, name: '游戏美术', slug: 'game-art', tagline: '角色与场景', cover: media },
        ['游戏'],
      ),
    ).toEqual({
      id: 3,
      title: '游戏美术',
      href: '/majors/game-art',
      excerpt: '角色与场景',
      meta: null,
      image: thumb,
    })
  })

  it('资讯：摘要有匹配用摘要；否则取正文中匹配附近的一段（跳过开头的标题与摘要）；补充信息是分类', () => {
    const doc = (overrides: Partial<ArticleHitSource> = {}): ArticleHitSource => ({
      id: 5,
      title: '作品集怎么准备',
      slug: 'portfolio',
      excerpt: '整理作品集的几个步骤。',
      searchText: `作品集怎么准备 整理作品集的几个步骤。 ${'正文'.repeat(60)}关于 Blender 的建议${'正文'.repeat(60)}`,
      cover: media,
      category: { id: 1, name: '学习指南' } as never,
      ...overrides,
    })
    expect(toArticleHit(doc(), ['步骤'])).toMatchObject({
      href: '/articles/portfolio',
      excerpt: '整理作品集的几个步骤。',
      meta: '学习指南',
    })
    const body = toArticleHit(doc(), ['blender']).excerpt ?? ''
    expect(body).toContain('Blender')
    expect(body).not.toContain('作品集怎么准备')
    // 只有标题匹配：用文章摘要
    expect(toArticleHit(doc(), ['怎么准备']).excerpt).toBe('整理作品集的几个步骤。')
    // 分类未填充、没有摘要与正文
    expect(
      toArticleHit(doc({ excerpt: ' ', searchText: null, category: 1 }), ['作品集']),
    ).toMatchObject({ excerpt: null, meta: null })
  })

  it('讲师：摘要是擅长领域（顿号分隔），补充信息是头衔', () => {
    expect(
      toTeacherHit(
        {
          id: 8,
          name: '陈老师',
          slug: 'chen',
          title: ' 资深动画师 ',
          avatar: media,
          specialties: [{ text: '角色绑定' }, { text: ' ' }, { text: '表演动画' }],
        },
        ['绑定'],
      ),
    ).toEqual({
      id: 8,
      title: '陈老师',
      href: '/teachers/chen',
      excerpt: '角色绑定、表演动画',
      meta: '资深动画师',
      image: thumb,
    })
  })

  it('作品：链接到作品详情（按 ID），补充信息是作者化名', () => {
    expect(
      toWorkHit(
        {
          id: 21,
          title: '灯塔守望者',
          description: '毕业短片。',
          cover: media,
          author: { displayName: '林同学' },
        },
        ['灯塔'],
      ),
    ).toEqual({
      id: 21,
      title: '灯塔守望者',
      href: '/works/21',
      excerpt: '毕业短片。',
      meta: '林同学',
      image: thumb,
    })
  })

  it('组内排序：标题含全部检索词 → 含部分检索词 → 只在正文中匹配；同档保持查询顺序；最多 10 条', () => {
    const hit = (id: number, title: string): SearchHit => ({
      id,
      title,
      href: `/x/${id}`,
      excerpt: null,
      meta: null,
      image: null,
    })
    const ranked = rankHits(
      [
        hit(1, '正文匹配一'),
        hit(2, 'Blender 角色'),
        hit(3, '正文匹配二'),
        hit(4, 'blender 入门'),
        hit(5, '角色动画'),
      ],
      ['blender', '角色'],
    )
    expect(ranked.map((h) => h.id)).toEqual([2, 4, 5, 1, 3])

    const many = Array.from({ length: 25 }, (_, i) => hit(i + 1, `结果 ${i + 1}`))
    expect(rankHits(many, ['结果'])).toHaveLength(SEARCH_GROUP_LIMIT)
    expect(rankHits(many, ['结果'], 3).map((h) => h.id)).toEqual([1, 2, 3])
  })
})

describe('搜索结果分组', () => {
  it('分组名称与分组键一一对应，顺序一致', () => {
    expect(Object.keys(zh.search.groups)).toEqual([...SEARCH_GROUP_KEYS])
    for (const key of SEARCH_GROUP_KEYS) expect(zh.search.groups[key]).toBeTruthy()
  })
})
