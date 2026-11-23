// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { parseSearchQuery } from '@/lib/search/query'
import type { SearchResults, SearchSuggestions } from '@/lib/search/types'

/**
 * 站内搜索页 /search 的纯函数与组件（jsdom）：标题 / 收录 / 提示规则、高亮（<mark>，HTML 字符串只是文字）、
 * 搜索框（role="search"、GET /search、提示与错误的关联、自动聚焦、导航后同步输入框、搜索中状态）、
 * 分组结果、无结果状态（在线咨询 search_empty）、页面版式（汇总、预览站说明、热门入口）、头部搜索按钮。
 * 数据库查询、客户端导航与收录标签由 e2e（tests/e2e/search.e2e.spec.ts）覆盖。
 */
const pathname = vi.hoisted(() => ({ current: '/' }))
/** next/form 替身记录的提交（action + q）；真实的 basePath 与客户端导航由 e2e 覆盖 */
const submissions = vi.hoisted(() => [] as { action: string; q: string | null }[])

vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('next/form', () => ({
  default: ({
    action,
    prefetch,
    onSubmit,
    children,
    ...rest
  }: Omit<React.ComponentProps<'form'>, 'action'> & { action: string; prefetch?: boolean }) => (
    <form
      action={action}
      data-prefetch={String(prefetch)}
      onSubmit={(event) => {
        onSubmit?.(event)
        event.preventDefault()
        const q = new FormData(event.currentTarget).get('q')
        submissions.push({ action, q: typeof q === 'string' ? q : null })
      }}
      {...rest}
    >
      {children}
    </form>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { SiteHeader } = await import('@/components/layout/site-header')
const { HighlightText, TemplateText } = await import('@/components/search/highlight-text')
const { SearchForm } = await import('@/components/search/search-form')
const { SEARCH_INPUT_ID } = await import('@/components/search/search-input')
const { SEARCH_EMPTY_POSITION, SearchNoResults } =
  await import('@/components/search/search-no-results')
const {
  SEARCH_PATH,
  searchFormMessage,
  searchInputValue,
  searchNavigationKey,
  searchPageNoindex,
  searchPageTitle,
} = await import('@/components/search/search-page')
const { SearchResults: SearchResultsView, visibleGroups } =
  await import('@/components/search/search-results')
const { SearchView } = await import('@/components/search/search-view')

const leadConfig: LeadFormConfig = {
  disciplines: [{ id: 1, name: '三维动画' }],
  cities: [],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  pathname.current = '/'
  submissions.length = 0
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const suggestions: SearchSuggestions = {
  disciplines: [
    { id: 1, name: '三维动画', shortName: '三维', slug: '3d-animation' },
    { id: 2, name: '游戏美术', shortName: '游戏', slug: 'game-art' },
  ],
  courses: [
    { id: 5, title: '三维动画设计长期就业班', slug: '3d-long', disciplineName: '三维动画' },
  ],
}

const noSuggestions: SearchSuggestions = { disciplines: [], courses: [] }

function hit(id: number, title: string, href: string, excerpt: string | null = null) {
  return { id, title, href, excerpt, meta: null, image: null }
}

const results: SearchResults = {
  groups: [
    {
      key: 'courses',
      total: 12,
      hits: Array.from({ length: 10 }, (_, i) =>
        hit(i + 1, `Blender 课程 ${i + 1}`, `/courses/c-${i + 1}`, '用 blender 做场景'),
      ),
    },
    { key: 'disciplines', total: 0, hits: [] },
    {
      key: 'articles',
      total: 1,
      hits: [
        {
          ...hit(21, '实时渲染', '/articles/rt', '熟悉 Blender 之后'),
          meta: '行业资讯',
          image: {
            src: '/api/media/file/rt-400x300.webp',
            alt: '渲染截图',
            width: 400,
            height: 300,
          },
        },
      ],
    },
    { key: 'teachers', total: 0, hits: [] },
    { key: 'works', total: 0, hits: [] },
  ],
  total: 13,
}

const emptyResults: SearchResults = {
  groups: results.groups.map((group) => ({ ...group, total: 0, hits: [] })),
  total: 0,
}

/** 渲染并返回 rerender（搜索框的 props 随“导航”变化） */
function mount(ui: React.ReactElement) {
  const view = render(ui)
  return { rerender: (next: React.ReactElement) => view.rerender(next) }
}

describe('搜索页规则', () => {
  it('标题：关键词合法时为“搜索：关键词”，没有关键词、空白或超长时为“站内搜索”', () => {
    expect(searchPageTitle(parseSearchQuery({ q: ' Blender ' }))).toBe('搜索：Blender')
    expect(searchPageTitle(parseSearchQuery({}))).toBe('站内搜索')
    expect(searchPageTitle(parseSearchQuery({ q: '   ' }))).toBe('站内搜索')
    expect(searchPageTitle(parseSearchQuery({ q: 'a'.repeat(51) }))).toBe('站内搜索')
  })

  it('收录：URL 里有 q（不论取值）就 noindex；没有 q 可以收录', () => {
    expect(searchPageNoindex({})).toBe(false)
    expect(searchPageNoindex({ page: '2' })).toBe(false)
    expect(searchPageNoindex({ q: '' })).toBe(true)
    expect(searchPageNoindex({ q: 'blender' })).toBe(true)
    expect(searchPageNoindex(new URLSearchParams('q=a&q=b'))).toBe(true)
  })

  it('导航标识：原始 q（重复时取第一个），截断到 100 个字；没有 q 为 null', () => {
    expect(searchNavigationKey({})).toBeNull()
    expect(searchNavigationKey({ q: '' })).toBe('')
    expect(searchNavigationKey({ q: ['a', 'b'] })).toBe('a')
    expect(searchNavigationKey({ q: 'x'.repeat(500) })).toHaveLength(100)
  })

  it('搜索框提示：空白关键词提示输入，超长为错误，其余不显示；输入框回填规范化 / 截断后的关键词', () => {
    expect(searchFormMessage(parseSearchQuery({}), null)).toBeNull()
    expect(searchFormMessage(parseSearchQuery({ q: '  ' }), '  ')).toEqual({
      kind: 'hint',
      text: '请输入要搜索的关键词',
    })
    expect(searchFormMessage(parseSearchQuery({ q: 'a'.repeat(60) }), 'a'.repeat(60))).toEqual({
      kind: 'error',
      text: '关键词不能超过 50 个字，请精简后再搜索',
    })
    expect(searchFormMessage(parseSearchQuery({ q: 'blender' }), 'blender')).toBeNull()

    expect(searchInputValue(parseSearchQuery({ q: '  Ｂlender   UI ' }))).toBe('Blender UI')
    expect(searchInputValue(parseSearchQuery({ q: 'a'.repeat(60) }))).toBe('a'.repeat(50))
    expect(searchInputValue(parseSearchQuery({}))).toBe('')
  })
})

describe('高亮与文案模板', () => {
  it('匹配片段渲染为 <mark>（保留原文大小写），其余是普通文字', () => {
    const { container } = render(
      <p>
        <HighlightText text="Blender 与 blender 入门" terms={['BLENDER']} />
      </p>,
    )
    const marks = container.querySelectorAll('mark')
    expect([...marks].map((mark) => mark.textContent)).toEqual(['Blender', 'blender'])
    expect(container.textContent).toBe('Blender 与 blender 入门')
  })

  it('HTML / 脚本字符串只作为文字渲染，不产生元素', () => {
    const text = '<img src=x onerror=alert(1)><b>粗体</b>'
    const { container } = render(
      <p>
        <HighlightText text={text} terms={['<b>']} />
      </p>,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.querySelector('mark')?.textContent).toBe('<b>')
    expect(container.textContent).toBe(text)
  })

  it('文案模板：占位符替换为节点，值里的“{…}”不再替换', () => {
    const { container } = render(
      <p>
        <TemplateText
          template="“{query}”共找到 {count} 条结果"
          values={{ query: '{count}', count: <strong>3</strong> }}
        />
      </p>,
    )
    expect(container.textContent).toBe('“{count}”共找到 3 条结果')
    expect(container.querySelector('strong')?.textContent).toBe('3')
  })
})

describe('搜索框', () => {
  it('role="search" 的 GET 表单提交到 /search；输入框 name=q、最多 50 个字、有标签', () => {
    mount(<SearchForm value="" navigationKey={null} message={null} autoFocus={false} />)
    const form = screen.getByRole('search')
    expect(form.getAttribute('action')).toBe(SEARCH_PATH)
    expect(form.getAttribute('method')).toBeNull()
    const input = screen.getByRole('searchbox', { name: '搜索关键词' })
    expect(input.id).toBe(SEARCH_INPUT_ID)
    expect(input.getAttribute('name')).toBe('q')
    expect(input.getAttribute('maxlength')).toBe('50')
    expect(input.getAttribute('enterkeyhint')).toBe('search')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBeNull()
  })

  it('超长错误：输入框 aria-invalid 并用 aria-describedby 关联错误文字；空白提示不标记为错误', () => {
    const { rerender } = mount(
      <SearchForm
        value={'a'.repeat(50)}
        navigationKey={'a'.repeat(60)}
        message={{ kind: 'error', text: '关键词不能超过 50 个字' }}
        autoFocus
      />,
    )
    const input = screen.getByRole('searchbox')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input).toHaveProperty('value', 'a'.repeat(50))
    const message = document.getElementById(input.getAttribute('aria-describedby') ?? '')
    expect(message?.textContent).toBe('关键词不能超过 50 个字')
    expect(message?.getAttribute('aria-live')).toBe('polite')

    rerender(
      <SearchForm
        value=""
        navigationKey=""
        message={{ kind: 'hint', text: '请输入要搜索的关键词' }}
        autoFocus
      />,
    )
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      '请输入要搜索的关键词',
    )
  })

  it('autoFocus 时挂载后聚焦输入框；有结果的页面不抢焦点', () => {
    mount(<SearchForm value="blender" navigationKey="blender" message={null} autoFocus={false} />)
    expect(document.activeElement).toBe(document.body)
    cleanup()
    mount(<SearchForm value="" navigationKey={null} message={null} autoFocus />)
    expect(document.activeElement).toBe(screen.getByRole('searchbox'))
  })

  it('提交：GET 到 /search?q=…（不预取），按钮进入“搜索中”状态，页面带着新关键词重新渲染后结束', () => {
    const { rerender } = mount(
      <SearchForm value="" navigationKey={null} message={null} autoFocus />,
    )
    const form = screen.getByRole('search')
    expect(form.getAttribute('data-prefetch')).toBe('false')
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'Blender 角色' } })
    fireEvent.submit(form)

    expect(submissions).toEqual([{ action: '/search', q: 'Blender 角色' }])
    expect(screen.getByRole('button', { name: '正在搜索…' })).toBeTruthy()

    rerender(
      <SearchForm
        value="Blender 角色"
        navigationKey="Blender 角色"
        message={null}
        autoFocus={false}
      />,
    )
    expect(screen.getByRole('button', { name: '搜索' })).toBeTruthy()
    expect(input).toHaveProperty('value', 'Blender 角色')
  })

  it('本表单发起的导航：页面返回规范化后的关键词时，不覆盖用户在等待期间继续输入的内容', () => {
    const { rerender } = mount(
      <SearchForm value="" navigationKey={null} message={null} autoFocus />,
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: ' blender ' } })
    fireEvent.submit(screen.getByRole('search'))
    fireEvent.change(input, { target: { value: ' blender 角色' } })
    rerender(
      <SearchForm value="blender" navigationKey=" blender " message={null} autoFocus={false} />,
    )
    expect(input).toHaveProperty('value', ' blender 角色')
  })

  it('关键词与当前地址相同：照常提交，但不进入“搜索中”状态（页面内容不会变化）', () => {
    mount(<SearchForm value="blender" navigationKey="blender" message={null} autoFocus={false} />)
    fireEvent.submit(screen.getByRole('search'))
    expect(submissions).toEqual([{ action: '/search', q: 'blender' }])
    expect(screen.getByRole('button', { name: '搜索' })).toBeTruthy()
  })

  it('不是本表单发起的导航（后退、头部搜索按钮）：输入框跟随地址栏，回到空搜索页时重新聚焦', () => {
    const { rerender } = mount(
      <SearchForm value="blender" navigationKey="blender" message={null} autoFocus={false} />,
    )
    const input = screen.getByRole('searchbox')
    rerender(<SearchForm value="" navigationKey={null} message={null} autoFocus />)
    expect(input).toHaveProperty('value', '')
    expect(document.activeElement).toBe(input)

    rerender(<SearchForm value="三维" navigationKey="三维" message={null} autoFocus={false} />)
    expect(input).toHaveProperty('value', '三维')
  })
})

describe('搜索结果', () => {
  it('只显示有结果的分组：h2 为“类型 N 条”，两组以上时给出按类型跳转的链接', () => {
    expect(visibleGroups(results).map((group) => group.key)).toEqual(['courses', 'articles'])
    render(<SearchResultsView results={results} terms={['blender']} />)

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual(['课程12 条', '资讯1 条'])

    const jump = screen.getByRole('navigation', { name: '按类型查看结果' })
    const links = within(jump).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#search-group-courses',
      '#search-group-articles',
    ])
    expect(links[0]!.textContent).toContain('12 条')
  })

  it('每组列出结果链接（不预取），标题是链接的名称；匹配超过显示条数时提示换更具体的关键词', () => {
    render(<SearchResultsView results={results} terms={['blender']} />)
    const courses = screen.getByRole('region', { name: /^课程/ })
    const items = within(courses).getAllByRole('listitem')
    expect(items).toHaveLength(10)
    const first = within(items[0]!).getByRole('link', { name: 'Blender 课程 1' })
    expect(first.getAttribute('href')).toBe('/courses/c-1')
    expect(first.getAttribute('data-prefetch')).toBe('false')
    expect(first.querySelectorAll('mark')).toHaveLength(2)
    expect(within(courses).getByText('仅显示前 10 条，换个更具体的关键词试试')).toBeTruthy()

    const articles = screen.getByRole('region', { name: /^资讯/ })
    expect(within(articles).queryByText(/仅显示前/)).toBeNull()
    // 缩略图是装饰（标题已说明内容），懒加载；补充信息与摘要是链接的说明
    const link = within(articles).getByRole('link', { name: '实时渲染' })
    const image = link.querySelector('img')
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('loading')).toBe('lazy')
    const described = (link.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
    expect(described).toEqual(['行业资讯', '熟悉 Blender 之后'])
    // 没有封面的结果用分组图标占位
    expect(items[0]!.querySelector('img')).toBeNull()
    expect(items[0]!.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('只有一组有结果时不显示跳转链接；没有结果时不渲染', () => {
    const single: SearchResults = {
      groups: results.groups.map((group) =>
        group.key === 'articles' ? group : { ...group, total: 0, hits: [] },
      ),
      total: 1,
    }
    const { container, rerender } = render(<SearchResultsView results={single} terms={[]} />)
    expect(screen.queryByRole('navigation')).toBeNull()
    rerender(<SearchResultsView results={emptyResults} terms={[]} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('无结果状态', () => {
  it('标题带关键词（文字），在线咨询打开留资弹窗：来源 search_empty、意向 consult', () => {
    expect(SEARCH_EMPTY_POSITION).toBe('search_empty')
    render(
      <LeadDialogProvider config={leadConfig}>
        <SearchNoResults query="<b>不存在</b>" />
      </LeadDialogProvider>,
    )
    const section = screen.getByRole('region', { name: '没有找到与“<b>不存在</b>”相关的内容' })
    expect(section.querySelector('b')).toBeNull()

    fireEvent.click(within(section).getByRole('button', { name: '在线咨询' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'search_empty',
    )
    expect(dialog.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('consult')
  })
})

describe('搜索页版式', () => {
  function renderView(props: Partial<React.ComponentProps<typeof SearchView>> & { q?: string }) {
    const { q, ...rest } = props
    const params = q === undefined ? {} : { q }
    const parsed = parseSearchQuery(params)
    return mount(
      <LeadDialogProvider config={leadConfig}>
        <SearchView
          parsed={parsed}
          navigationKey={searchNavigationKey(params)}
          results={parsed.status === 'ok' ? results : null}
          suggestions={suggestions}
          preview={false}
          {...rest}
        />
      </LeadDialogProvider>,
    )
  }

  it('空搜索：h1“站内搜索”、面包屑、热门专业与热门课程链接；结果汇总为空（仍渲染，供读屏播报）', () => {
    renderView({})
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('站内搜索')
    expect(screen.getByRole('navigation', { name: '面包屑' })).toBeTruthy()
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('')
    const hot = screen.getByRole('region', { name: '热门专业' })
    expect(
      within(hot)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/majors/3d-animation', '/majors/game-art'])
    const courses = screen.getByRole('region', { name: '热门课程' })
    expect(within(courses).getByRole('link', { name: /三维动画设计长期就业班/ })).toBeTruthy()
    expect(within(courses).getByRole('link', { name: '查看全部课程' }).getAttribute('href')).toBe(
      '/courses',
    )
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('有结果：汇总“关键词共找到 N 条结果”（可见），分组结果，桌面端侧栏热门推荐', () => {
    renderView({ q: 'blender' })
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('“blender”共找到 13 条结果')
    expect(status.className).not.toContain('sr-only')
    expect(screen.getByRole('region', { name: /^课程/ })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: '热门推荐' })).toBeTruthy()
  })

  it('无结果：汇总只给读屏，显示无结果说明与热门入口', () => {
    renderView({ q: 'zzz', results: emptyResults })
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('“zzz”共找到 0 条结果')
    expect(status.className).toContain('sr-only')
    expect(screen.getByRole('region', { name: '没有找到与“zzz”相关的内容' })).toBeTruthy()
    expect(screen.getByRole('region', { name: '热门专业' })).toBeTruthy()
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('没有任何热门入口时，空搜索页只有标题区', () => {
    renderView({ suggestions: noSuggestions })
    expect(screen.queryByRole('region', { name: '热门专业' })).toBeNull()
    expect(screen.queryByRole('region', { name: '热门课程' })).toBeNull()
  })

  it('静态预览站：搜索框下方说明搜索需要服务器', () => {
    renderView({ preview: true })
    expect(screen.getByRole('note').textContent).toContain('静态预览站不支持搜索')
  })
})

describe('头部搜索按钮', () => {
  function renderHeader() {
    render(
      <LeadDialogProvider config={leadConfig}>
        <SiteHeader
          brand={{ name: 'EduVerse 数艺学院', shortName: 'EduVerse' }}
          items={[{ label: '首页', type: 'link', href: '/' }]}
          ctaLabel="预约试听"
          showSearch
          hotline={null}
          groups={[]}
          campuses={[]}
        />
        <input id={SEARCH_INPUT_ID} type="search" defaultValue="blender" aria-label="搜索关键词" />
      </LeadDialogProvider>,
    )
    return screen.getByRole('banner')
  }

  it('链接到 /search；不在搜索页时只是普通链接', () => {
    const header = renderHeader()
    const link = within(header).getByRole('link', { name: '搜索' })
    expect(link.getAttribute('href')).toBe('/search')
    expect(link.getAttribute('aria-current')).toBeNull()
    // jsdom 不支持跳转文档：拦下默认行为，只检查点击处理
    link.addEventListener('click', (event) => event.preventDefault())
    act(() => link.click())
    expect(document.activeElement).not.toBe(document.getElementById(SEARCH_INPUT_ID))
  })

  it('已经在搜索页：标记为当前页，点击直接把焦点放进搜索框并选中已有文字', () => {
    pathname.current = '/search'
    const header = renderHeader()
    const link = within(header).getByRole('link', { name: '搜索' })
    expect(link.getAttribute('aria-current')).toBe('page')
    link.addEventListener('click', (event) => event.preventDefault())
    act(() => link.click())
    const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement
    expect(document.activeElement).toBe(input)
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'blender'.length])
  })
})
