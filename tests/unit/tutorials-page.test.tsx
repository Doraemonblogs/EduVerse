// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { zh } from '@/i18n/zh'
import type { LeadActionState } from '@/lib/lead/actions'
import {
  TUTORIAL_GATE_PASSED_STORAGE_KEY,
  TUTORIAL_UNLOCK_STORAGE_KEY,
} from '@/lib/tutorials/storage'
import type { TutorialCardData, TutorialPagesSettings } from '@/lib/tutorials/types'

import { ANIMATION, GAME } from '../helpers/work-fixtures'

/**
 * 免费教程列表页 /tutorials 专属的纯函数与组件（jsdom）：元数据输入、VideoObject 结构化数据、时长转换、
 * 信息行、空状态，以及卡片 + 播放弹窗（地址同步、留资解锁、本地解锁记录、深链接、焦点归还）。
 * Server Action 用 mock 代替；真实浏览器中的第三方请求、筛选与线索入库由 e2e（tests/e2e/tutorials.e2e.spec.ts）覆盖。
 *
 * 注意：本页面内解锁过的教程会记在模块级内存里（localStorage 不可用时的兜底），
 * 所以每个涉及解锁的用例使用不同的教程 ID，互不影响。
 * “已留资”标记只在 localStorage 写不进时记在内存里，且之后所有 gated 教程都算已解锁：
 * 模拟存储不可用的用例放在弹窗用例的最后。
 */
const submitLeadAction = vi.hoisted(() =>
  vi.fn<(previous: LeadActionState, formData: FormData) => Promise<LeadActionState>>(),
)

vi.mock('@/lib/lead/actions', () => ({ submitLeadAction }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch,
    scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a
      href={href}
      data-prefetch={String(prefetch)}
      data-scroll={scroll === undefined ? undefined : String(scroll)}
      {...rest}
    >
      {children}
    </a>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { TutorialCard } = await import('@/components/tutorials/tutorial-card')
const { TutorialPlayer } = await import('@/components/tutorials/tutorial-player')
const { TutorialMeta } = await import('@/components/tutorials/tutorial-meta')
const { TutorialsListEmpty } = await import('@/components/tutorials/tutorials-list-empty')
const { tutorialIsoDuration, tutorialsMetadataInput, tutorialVideoJsonLd } =
  await import('@/components/tutorials/tutorials-list')

const t = zh.tutorials

const config: LeadFormConfig = {
  disciplines: [
    { id: ANIMATION.id, name: ANIMATION.name },
    { id: GAME.id, name: GAME.name },
  ],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const gate: TutorialPagesSettings['gate'] = {
  title: '留下联系方式，解锁这节教程',
  description: '提交后即可观看本节教程。',
  submitLabel: '解锁观看',
}

const COVER = { src: '/api/media/file/tutorial-800x450.webp', alt: '', width: 800, height: 450 }

const tutorial = (overrides: Partial<TutorialCardData> = {}): TutorialCardData => ({
  id: 101,
  slug: 'blender-low-poly-cabin',
  title: 'Blender 入门：做一座低多边形小木屋',
  description: '从界面与视图操作讲起。',
  cover: COVER,
  discipline: ANIMATION,
  level: 'beginner',
  provider: 'bilibili',
  videoId: 'BV1ED00000a1',
  embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1ED00000a1',
  duration: '18:40',
  gated: false,
  addedAt: '2026-11-20T02:00:00.000Z',
  ...overrides,
})

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  submitLeadAction.mockReset()
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
  window.localStorage.clear()
  window.history.replaceState(null, '', '/tutorials')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderList(tutorials: TutorialCardData[]) {
  return render(
    <LeadDialogProvider config={config}>
      <TutorialPlayer tutorials={tutorials} gate={gate}>
        <ul role="list">
          {tutorials.map((item) => (
            <li key={item.id}>
              <TutorialCard tutorial={item} />
            </li>
          ))}
        </ul>
      </TutorialPlayer>
    </LeadDialogProvider>,
  )
}

const cardButton = (title: string) => screen.getByRole('button', { name: `观看教程：${title}` })

/** 填写留资表单并提交（Server Action 已 mock） */
async function submitGate(dialog: HTMLElement) {
  const form = within(dialog)
  fireEvent.change(form.getByLabelText(zh.lead.labels.name, { exact: false }), {
    target: { value: '张同学' },
  })
  fireEvent.change(form.getByLabelText(zh.lead.labels.phone, { exact: false }), {
    target: { value: '138 0013 8000' },
  })
  fireEvent.click(form.getByRole('checkbox'))
  await act(async () => {
    fireEvent.click(form.getByRole('button', { name: gate.submitLabel }))
  })
}

describe('tutorialIsoDuration：时长文字 → ISO 8601', () => {
  it('分:秒 与 时:分:秒', () => {
    expect(tutorialIsoDuration('18:40')).toBe('PT18M40S')
    expect(tutorialIsoDuration(' 9:05 ')).toBe('PT9M5S')
    expect(tutorialIsoDuration('1:02:03')).toBe('PT1H2M3S')
    expect(tutorialIsoDuration('2:00:00')).toBe('PT2H')
    expect(tutorialIsoDuration('120:00')).toBe('PT120M')
  })

  it('格式不对、为空或为 0 时不输出', () => {
    for (const value of [
      null,
      '',
      '18分40秒',
      '18:4',
      '18:60',
      '1:60:00',
      'abc',
      '0:00',
      '-1:20',
    ]) {
      expect(tutorialIsoDuration(value), String(value)).toBeUndefined()
    }
  })
})

describe('tutorialVideoJsonLd：VideoObject 结构化数据', () => {
  it('只输出不需要留资、播放器地址可用的教程；封面为绝对地址（子路径不重复）；uploadDate 为收录时间', () => {
    const siteUrl = 'https://example.github.io/EduVerse'
    const nodes = tutorialVideoJsonLd(
      [
        tutorial({ cover: { ...COVER, src: '/EduVerse/api/media/file/a-800x450.webp' } }),
        tutorial({ id: 102, title: '需要留资', gated: true }),
        tutorial({ id: 103, title: '地址不可用', embedUrl: null }),
        tutorial({
          id: 104,
          title: '没有简介',
          description: null,
          duration: null,
          cover: null,
          discipline: null,
        }),
      ],
      siteUrl,
    )
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toEqual({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Blender 入门：做一座低多边形小木屋',
      description: '从界面与视图操作讲起。',
      thumbnailUrl: 'https://example.github.io/EduVerse/api/media/file/a-800x450.webp',
      uploadDate: '2026-11-20T02:00:00.000Z',
      embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1ED00000a1',
      duration: 'PT18M40S',
      genre: ANIMATION.name,
      inLanguage: 'zh-CN',
      isAccessibleForFree: true,
    })
    // 缺少的字段不输出；没有简介时用标题
    expect(nodes[1]).toMatchObject({ name: '没有简介', description: '没有简介' })
    expect(nodes[1]).not.toHaveProperty('thumbnailUrl')
    expect(nodes[1]).not.toHaveProperty('duration')
    expect(nodes[1]).not.toHaveProperty('genre')
    // 搜索引擎视频结构化数据的必填项：name、thumbnailUrl、uploadDate（ISO 8601）
    for (const node of nodes) {
      expect(node.uploadDate).toBe('2026-11-20T02:00:00.000Z')
      expect(Number.isNaN(Date.parse(String(node.uploadDate)))).toBe(false)
    }
  })
})

describe('tutorialsMetadataInput：列表页元数据', () => {
  const list: TutorialPagesSettings['list'] = {
    title: '免费教程',
    description: '列表简介',
    seo: { title: 'SEO 标题', description: 'SEO 描述', keywords: '教程,Blender' },
  }

  it('普通列表：使用教程页面设置的 SEO、标题与简介，canonical /tutorials', () => {
    expect(tutorialsMetadataInput(list, null)).toEqual({
      seo: list.seo,
      title: '免费教程',
      description: '列表简介',
      shareImage: null,
      path: '/tutorials',
    })
  })

  it('深链接：标题、描述、分享图换成教程的，只保留列表页关键词', () => {
    expect(tutorialsMetadataInput(list, tutorial())).toEqual({
      seo: { keywords: '教程,Blender' },
      title: 'Blender 入门：做一座低多边形小木屋',
      description: '从界面与视图操作讲起。',
      shareImage: COVER,
      path: '/tutorials',
    })
    const bare = tutorialsMetadataInput({ ...list, seo: null }, tutorial({ description: null }))
    expect(bare.seo).toBeNull()
    expect(bare.description).toBe('列表简介')
  })
})

describe('TutorialMeta：教程信息行', () => {
  it('专业简称 · 难度 · 时长 · 平台，读屏补充前缀', () => {
    render(<TutorialMeta tutorial={tutorial()} id="meta" />)
    const meta = document.getElementById('meta')!
    expect(meta.textContent).toBe('三维动画，难度 入门，时长 18:40，播放平台 哔哩哔哩')
    expect(within(meta).getByText('哔哩哔哩')).toBeTruthy()
  })

  it('卡片：时长只给读屏（可见时长在封面上）；没有专业方向时不显示', () => {
    render(
      <TutorialMeta
        tutorial={tutorial({ discipline: null, level: 'advanced' })}
        id="meta"
        duration="sr-only"
      />,
    )
    const meta = document.getElementById('meta')!
    expect(meta.textContent).toBe('难度 高阶，播放平台 哔哩哔哩，时长 18:40')
    expect(within(meta).getByText('，时长 18:40', { exact: false }).className).toContain('sr-only')
  })
})

describe('TutorialsListEmpty', () => {
  it('筛选无结果：清除筛选（nofollow、不预取）+ 查看专业课程', () => {
    render(
      <LeadDialogProvider config={config}>
        <TutorialsListEmpty filtered />
      </LeadDialogProvider>,
    )
    const empty = within(screen.getByRole('region', { name: t.list.emptyTitle }))
    const clear = empty.getByRole('link', { name: zh.filterBar.clear })
    expect(clear.getAttribute('href')).toBe('/tutorials')
    expect(clear.getAttribute('rel')).toBe('nofollow')
    expect(clear.getAttribute('data-prefetch')).toBe('false')
    expect(empty.getByRole('link', { name: t.list.viewCourses }).getAttribute('href')).toBe(
      '/courses',
    )
    expect(empty.queryByRole('button', { name: t.list.trial })).toBeNull()
  })

  it('还没有任何教程：预约试听（position tutorials_list_empty），没有可清除的筛选', () => {
    render(
      <LeadDialogProvider config={config}>
        <TutorialsListEmpty filtered={false} />
      </LeadDialogProvider>,
    )
    const empty = within(screen.getByRole('region', { name: t.list.noTutorialsTitle }))
    expect(empty.queryByRole('link', { name: zh.filterBar.clear })).toBeNull()
    fireEvent.click(empty.getByRole('button', { name: t.list.trial }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'tutorials_list_empty',
    )
    expect(dialog.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('trial')
  })
})

describe('教程卡片与播放弹窗', () => {
  it('卡片：整卡按钮（读屏名称、描述、aria-haspopup），留资徽标，h2 标题，平台文字', () => {
    const open = tutorial()
    const gated = tutorial({ id: 102, title: '角色走路循环', gated: true })
    renderList([open, gated])
    const button = cardButton(open.title)
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    const description = (button.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' ')
    expect(description).toContain('难度 入门')
    expect(description).toContain('时长 18:40')
    expect(description).not.toContain(t.card.gated)
    const gatedIds = cardButton(gated.title).getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(gatedIds.split(' ')[0]!)?.textContent).toBe(t.card.gated)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      open.title,
      gated.title,
    ])
    expect(screen.getAllByText('哔哩哔哩')).toHaveLength(2)
    expect(screen.getAllByText(t.card.gated)).toHaveLength(1)
  })

  it('不需要留资：点击打开弹窗（地址同步 ?play=，保留筛选参数），只有播放按钮外观；Esc 关闭后焦点回到卡片', async () => {
    window.history.replaceState(null, '', '/tutorials?discipline=3d-animation')
    const item = tutorial()
    renderList([item])
    const opener = cardButton(item.title)
    opener.focus()
    fireEvent.click(opener)

    const dialog = screen.getByRole('dialog', { name: item.title })
    expect(window.location.search).toBe(`?discipline=3d-animation&play=${item.id}`)
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(within(dialog).getByText(item.description!)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: `播放视频：${item.title}` })).toBeTruthy()
    expect(dialog.querySelector('iframe')).toBeNull()
    expect(within(dialog).queryByRole('textbox')).toBeNull()
    expect(within(dialog).getByText(zh.video.notice)).toBeTruthy()
    expect(
      within(dialog)
        .getByRole('link', { name: `了解${ANIMATION.name}专业` })
        .getAttribute('href'),
    ).toBe(`/majors/${ANIMATION.slug}`)

    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.location.search).toBe('?discipline=3d-animation')
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('留资解锁：表单带教程上下文；提交成功后原地显示播放器、播报解锁、焦点移到播放按钮，并记住解锁', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: 1_700_000_000_000 })
    const item = tutorial({ id: 201, title: '角色走路循环', gated: true })
    renderList([item])
    fireEvent.click(cardButton(item.title))

    const dialog = screen.getByRole('dialog', { name: item.title })
    const gateRegion = within(dialog).getByRole('region', { name: gate.title })
    expect(within(gateRegion).getByText(gate.description!)).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: /^播放视频/ })).toBeNull()
    const hidden = (name: string) =>
      dialog.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value
    expect(hidden('intent')).toBe('tutorial')
    expect(hidden('position')).toBe('tutorial_gate')
    expect(hidden('tutorial')).toBe(String(item.id))
    expect(within(dialog).getByLabelText<HTMLSelectElement>(zh.lead.labels.discipline).value).toBe(
      String(ANIMATION.id),
    )

    await submitGate(dialog)
    const submitted = Object.fromEntries(submitLeadAction.mock.lastCall![1].entries())
    expect(submitted).toMatchObject({
      intent: 'tutorial',
      position: 'tutorial_gate',
      tutorial: String(item.id),
      discipline: String(ANIMATION.id),
    })

    const status = await within(dialog).findByText(t.gate.unlocked)
    expect(status.closest('[role="status"]')).toBeTruthy()
    const play = within(dialog).getByRole('button', { name: `播放视频：${item.title}` })
    expect(document.activeElement).toBe(play)
    expect(within(dialog).queryByRole('region', { name: gate.title })).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(TUTORIAL_UNLOCK_STORAGE_KEY) ?? '[]')).toEqual([
      item.id,
    ])
    expect(window.localStorage.getItem(TUTORIAL_GATE_PASSED_STORAGE_KEY)).toBe('1')
    // 卡片徽标同步改为“已解锁”（弹窗打开时页面其余部分对读屏隐藏，按文字查找）
    expect(screen.getByText(t.card.unlocked)).toBeTruthy()
  })

  it('留资一次后其它 gated 教程一并解锁：徽标全部改为“已解锁”，打开另一个直接显示播放器，不再提交线索', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: 1_700_000_000_000 })
    const first = tutorial({ id: 211, title: '第一个留资教程', gated: true })
    const second = tutorial({ id: 212, title: '第二个留资教程', gated: true })
    renderList([first, second, tutorial({ id: 213, title: '公开教程' })])
    expect(screen.getAllByText(t.card.gated)).toHaveLength(2)

    fireEvent.click(cardButton(first.title))
    const dialog = screen.getByRole('dialog', { name: first.title })
    await submitGate(dialog)
    await within(dialog).findByRole('button', { name: `播放视频：${first.title}` })
    expect(screen.queryAllByText(t.card.gated)).toHaveLength(0)
    expect(screen.getAllByText(t.card.unlocked)).toHaveLength(2)
    // 逐个教程的记录仍然只有提交过的那个
    expect(JSON.parse(window.localStorage.getItem(TUTORIAL_UNLOCK_STORAGE_KEY) ?? '[]')).toEqual([
      first.id,
    ])

    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(cardButton(second.title))
    const other = screen.getByRole('dialog', { name: second.title })
    expect(within(other).getByRole('button', { name: `播放视频：${second.title}` })).toBeTruthy()
    expect(within(other).queryByRole('region', { name: gate.title })).toBeNull()
    expect(within(other).queryByRole('textbox')).toBeNull()
    // 直接打开的教程不播报“已解锁”（那是提交成功的反馈）
    expect(within(other).queryByText(t.gate.unlocked)).toBeNull()
    expect(submitLeadAction).toHaveBeenCalledTimes(1)
  })

  it('本浏览器已留资（“已留资”标记）：所有 gated 教程直接显示播放器，徽标为“已解锁”', () => {
    window.localStorage.setItem(TUTORIAL_GATE_PASSED_STORAGE_KEY, '1')
    const items = [311, 312].map((id) => tutorial({ id, title: `留资教程 ${id}`, gated: true }))
    renderList(items)
    expect(screen.getAllByText(t.card.unlocked)).toHaveLength(2)
    expect(screen.queryAllByText(t.card.gated)).toHaveLength(0)
    fireEvent.click(cardButton(items[1]!.title))
    const dialog = screen.getByRole('dialog', { name: items[1]!.title })
    expect(
      within(dialog).getByRole('button', { name: `播放视频：${items[1]!.title}` }),
    ).toBeTruthy()
    expect(within(dialog).queryByRole('region', { name: gate.title })).toBeNull()
  })

  it('本浏览器已解锁（localStorage）的教程直接显示播放器', () => {
    window.localStorage.setItem(TUTORIAL_UNLOCK_STORAGE_KEY, JSON.stringify([301]))
    const item = tutorial({ id: 301, title: '已解锁的教程', gated: true })
    renderList([item])
    expect(screen.getByText(t.card.unlocked)).toBeTruthy()
    fireEvent.click(cardButton(item.title))
    const dialog = screen.getByRole('dialog', { name: item.title })
    expect(within(dialog).getByRole('button', { name: `播放视频：${item.title}` })).toBeTruthy()
    expect(within(dialog).queryByRole('region', { name: gate.title })).toBeNull()
  })

  it('播放器地址不可用的 gated 教程不要求留资，直接显示“视频暂不可用”', () => {
    const item = tutorial({ id: 501, title: '地址失效的教程', gated: true, embedUrl: null })
    renderList([item])
    fireEvent.click(cardButton(item.title))
    const dialog = screen.getByRole('dialog', { name: item.title })
    expect(within(dialog).getByText(zh.video.unavailable)).toBeTruthy()
    expect(within(dialog).queryByRole('region', { name: gate.title })).toBeNull()
    expect(within(dialog).queryByText(zh.video.notice)).toBeNull()
  })

  it('深链接 ?play=<id>：挂载时直接打开；关闭后焦点落到对应卡片按钮', async () => {
    const first = tutorial()
    const second = tutorial({ id: 102, title: '第二个教程', description: null, discipline: null })
    window.history.replaceState(null, '', `/tutorials?play=${second.id}`)
    renderList([first, second])
    const dialog = screen.getByRole('dialog', { name: second.title })
    // 没有简介：不关联描述，也没有专业方向链接
    expect(dialog.hasAttribute('aria-describedby')).toBe(false)
    expect(within(dialog).queryByRole('link')).toBeNull()

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: zh.lead.close }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.location.search).toBe('')
    await waitFor(() => expect(document.activeElement).toBe(cardButton(second.title)))
  })

  it('play 指向不在列表里的教程或格式不对时不打开弹窗', () => {
    for (const value of ['999', 'abc', '012']) {
      window.history.replaceState(null, '', `/tutorials?play=${value}`)
      renderList([tutorial()])
      expect(screen.queryByRole('dialog'), value).toBeNull()
      cleanup()
    }
  })

  // 放在最后：存储写不进时“已留资”记在模块级内存里，之后的用例里所有 gated 教程都会显示为已解锁
  it('localStorage 不可用时：提交成功后本页面内仍解锁（其它 gated 教程也一并解锁），不抛错', async () => {
    submitLeadAction.mockResolvedValue({ status: 'success', submittedAt: 1 })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const item = tutorial({ id: 401, title: '隐私模式下的教程', gated: true })
    const other = tutorial({ id: 402, title: '隐私模式下的另一个教程', gated: true })
    renderList([item, other])
    fireEvent.click(cardButton(item.title))
    const dialog = screen.getByRole('dialog', { name: item.title })
    await submitGate(dialog)
    expect(
      await within(dialog).findByRole('button', { name: `播放视频：${item.title}` }),
    ).toBeTruthy()
    expect(within(dialog).getByText(t.gate.unlocked)).toBeTruthy()
    expect(screen.getAllByText(t.card.unlocked)).toHaveLength(2)

    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' })
    })
    fireEvent.click(cardButton(other.title))
    const otherDialog = screen.getByRole('dialog', { name: other.title })
    expect(
      within(otherDialog).getByRole('button', { name: `播放视频：${other.title}` }),
    ).toBeTruthy()
    expect(within(otherDialog).queryByRole('region', { name: gate.title })).toBeNull()
  })
})
