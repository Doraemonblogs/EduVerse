// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import { zh } from '@/i18n/zh'
import type {
  CareerEvent,
  CareersHeroBanner,
  CareersPageData,
  CareerStory,
} from '@/lib/careers/types'

/**
 * 就业服务页（/careers）的纯函数与页面主体输出（jsdom）：区块取舍与底色、服务流程、学员故事的展开阅读与化名说明、
 * 招聘活动卡片与空状态、首屏背景图（后台轮播图）与留资来源、结尾表单、Event 结构化数据，以及广告法用语检查。
 * 真实数据、活动日期过滤、响应式与线索入库由 e2e（tests/e2e/careers.e2e.spec.ts）覆盖。
 */
vi.mock('@/lib/lead/actions', () => ({ submitLeadAction: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.ComponentProps<'a'> & { href: string; prefetch?: boolean; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { LeadDialogProvider } = await import('@/components/lead/lead-dialog')
const { CareersView } = await import('@/components/careers/careers-view')
const { careerEventsJsonLd } = await import('@/components/careers/careers-json-ld')
const {
  CAREERS_HERO_SCRIM_CLASS,
  careerEventAnchor,
  careersSectionKeys,
  careersSectionTones,
  processGridClass,
  stepNumber,
} = await import('@/components/careers/careers-layout')
const { isRichTextFilled } = await import('@/lib/rich-text-filled')

/** 广告法：页面上不得出现的结果性 / 薪资类表述 */
const BANNED = /就业率|包就业|保证|薪资|高薪|月薪|年薪|入职率|承诺/

const leadConfig: LeadFormConfig = {
  disciplines: [{ id: 7, name: '三维动画' }],
  cities: ['上海'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const storyBody = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        children: [{ type: 'text', text: '转行的起点', version: 1, format: 0 }],
      },
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: '她在贸易公司做了四年财务。', version: 1, format: 0 }],
      },
    ],
  },
} as NonNullable<CareerStory['story']>

const emptyBody = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [{ type: 'paragraph', version: 1, children: [] }],
  },
} as NonNullable<CareerStory['story']>

function story(overrides: Partial<CareerStory> = {}): CareerStory {
  return {
    id: 1,
    displayName: '小鹿',
    background: '财务专员转行',
    avatar: null,
    currentRole: 'UI 设计师',
    companyName: '星槎网络科技',
    quote: '先把逻辑理清楚，再动手画。',
    course: { title: 'UI/UX 设计长期就业班', slug: 'ui-ux-career' },
    story: storyBody,
    ...overrides,
  }
}

function event(overrides: Partial<CareerEvent> = {}): CareerEvent {
  return {
    id: 31,
    title: '作品集评审日',
    // 北京时间 2026-12-14 14:00
    date: '2026-12-14T06:00:00.000Z',
    location: '上海徐汇校区 5 层评图室',
    campus: {
      name: '上海徐汇校区',
      slug: 'shanghai-xuhui',
      city: '上海',
      address: '上海市徐汇区示例路 2 号',
    },
    image: { src: '/api/media/file/event-640x400.webp', alt: '', width: 640, height: 400 },
    description: '讲师与企业美术负责人逐份点评作品集。',
    registrationNote: '提前在校区前台登记。',
    ...overrides,
  }
}

function heroBanner(overrides: Partial<CareersHeroBanner> = {}): CareersHeroBanner {
  return {
    id: 97,
    image: {
      src: '/api/media/file/careers-1920x800.webp',
      alt: '学员在评图室讨论作品集',
      width: 1920,
      height: 800,
    },
    mobileImage: {
      src: '/api/media/file/careers-mobile-750x1000.webp',
      alt: '学员在评图室讨论作品集（竖图）',
      width: 750,
      height: 1000,
    },
    startAt: null,
    endAt: null,
    ...overrides,
  }
}

const heading = (title: string, eyebrow: string | null = null) => ({
  eyebrow,
  title,
  description: null,
})

function pageData(overrides: Partial<CareersPageData> = {}): CareersPageData {
  return {
    intro: {
      eyebrow: 'Career Services',
      title: '就业服务',
      description: '从作品集到面试，陪你准备求职的每一步。',
    },
    heroBanners: [],
    process: {
      heading: heading('就业服务流程', 'Process'),
      items: [
        { title: '作品集打磨', description: '讲师按目标岗位逐一点评。' },
        { title: '模拟面试', description: null },
      ],
    },
    stories: {
      heading: heading('学员故事', 'Stories'),
      items: [story(), story({ id: 2, displayName: '沐沐', story: null })],
    },
    partners: {
      heading: heading('合作企业'),
      items: [
        {
          id: 1,
          name: '青岚互动',
          industry: null,
          logo: { src: '/api/media/file/logo-400x200.webp', alt: '', width: 400, height: 200 },
        },
      ],
    },
    events: { heading: heading('招聘活动'), items: [event()] },
    cta: { title: '预约一次就业咨询', description: '录用由企业自主决定。' },
    seo: null,
    ...overrides,
  }
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderView(
  data: CareersPageData = pageData(),
  events = data.events?.items ?? [],
  banner: CareersHeroBanner | null = null,
) {
  return render(
    <LeadDialogProvider config={leadConfig}>
      <CareersView data={data} events={events} heroBanner={banner} leadConfig={leadConfig} />
    </LeadDialogProvider>,
  )
}

const byId = (id: string) => document.getElementById(id)!
const hero = () => byId('careers-title').closest('section')!

describe('就业服务页的纯函数', () => {
  it('区块取舍：为 null 的区块不渲染；中间区块从白底开始白 / 米交替', () => {
    const keys = careersSectionKeys(pageData({ stories: null }))
    expect(keys).toEqual(['process', 'partners', 'events'])
    expect([...careersSectionTones(keys)]).toEqual([
      ['process', 'light'],
      ['partners', 'paper'],
      ['events', 'light'],
    ])
    expect(careersSectionKeys(pageData({ process: null, partners: null, events: null }))).toEqual([
      'stories',
    ])
  })

  it('服务流程列数：不超过 4 步一行排完，5、6 步排成 3 列；序号两位数', () => {
    expect(processGridClass(1)).toBe('')
    expect(processGridClass(2)).toBe('sm:grid-cols-2')
    expect(processGridClass(3)).toBe('sm:grid-cols-2 lg:grid-cols-3')
    expect(processGridClass(4)).toBe('sm:grid-cols-2 lg:grid-cols-4')
    expect(processGridClass(5)).toBe('sm:grid-cols-2 lg:grid-cols-3')
    expect(processGridClass(6)).toBe('sm:grid-cols-2 lg:grid-cols-3')
    expect([0, 1, 9].map(stepNumber)).toEqual(['01', '02', '10'])
  })

  it('故事正文：未填写、只有空段落都视为没有正文（共用 isRichTextFilled）；活动锚点', () => {
    expect(isRichTextFilled(null)).toBe(false)
    expect(isRichTextFilled(emptyBody)).toBe(false)
    expect(isRichTextFilled(storyBody)).toBe(true)
    expect(careerEventAnchor(31)).toBe('career-event-31')
  })
})

describe('Event 结构化数据', () => {
  const options = { siteUrl: 'https://www.example.com/EduVerse', brandName: 'EduVerse 数艺学院' }

  it('有举办校区的活动：名称、开始时间、线下地点（PostalAddress）、主办方、图片绝对地址与页内锚点', () => {
    const [data] = careerEventsJsonLd(
      [event({ image: { ...event().image!, src: '/EduVerse/api/media/file/e.webp' } })],
      options,
    )
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: '作品集评审日',
      startDate: '2026-12-14T06:00:00.000Z',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: '上海徐汇校区 5 层评图室',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '上海市徐汇区示例路 2 号',
          addressLocality: '上海',
          addressCountry: 'CN',
        },
      },
      organizer: {
        '@type': 'Organization',
        name: 'EduVerse 数艺学院',
        url: 'https://www.example.com/EduVerse',
      },
      url: 'https://www.example.com/EduVerse/careers#career-event-31',
      description: '讲师与企业美术负责人逐份点评作品集。',
      // 子路径部署：媒体地址已带 basePath，不重复拼接
      image: ['https://www.example.com/EduVerse/api/media/file/e.webp'],
    })
  })

  it('没有实际地址的活动（线上直播、校区未发布）不输出；地点为空时用校区名；没有说明与图片时省略', () => {
    const online = event({ id: 1, location: '线上直播', campus: null })
    const plain = event({ id: 2, location: null, description: null, image: null })
    const result = careerEventsJsonLd([online, plain], options)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ location: { name: '上海徐汇校区' } })
    expect(result[0]).not.toHaveProperty('description')
    expect(result[0]).not.toHaveProperty('image')
  })
})

describe('CareersView', () => {
  it('首屏：面包屑到就业服务页，眉标、h1 与描述来自后台；右侧提示最近一场活动并链接到活动列表', () => {
    renderView()
    expect(screen.getByRole('heading', { level: 1, name: '就业服务' })).toBeTruthy()
    expect(within(hero()).getByText('Career Services')).toBeTruthy()
    expect(within(hero()).getByText('从作品集到面试，陪你准备求职的每一步。')).toBeTruthy()

    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getByText('就业服务').getAttribute('aria-current')).toBe('page')

    expect(within(hero()).getByText('最近一场活动')).toBeTruthy()
    expect(within(hero()).getByText('作品集评审日')).toBeTruthy()
    expect(within(hero()).getByText('2026年12月14日 14:00').getAttribute('dateTime')).toBe(
      '2026-12-14T06:00:00.000Z',
    )
    expect(
      within(hero())
        .getByRole('link', { name: /查看全部活动/ })
        .getAttribute('href'),
    ).toBe('#careers-events')
  })

  it('首屏背景图：投放中的轮播图铺满首屏（≥ 640px 桌面图、以下移动端图），纯装饰，立即加载并提高优先级，不插入 preload', () => {
    renderView(pageData(), undefined, heroBanner())
    const section = hero()
    expect(section.className).toContain('isolate')
    // 内容版心仍是区块的第一个子元素，背景层在其后（-z-10 画在内容之下）
    expect(section.firstElementChild?.querySelector('h1')).toBeTruthy()

    const picture = section.querySelector('picture')!
    const backdrop = picture.parentElement!
    expect(backdrop.getAttribute('aria-hidden')).toBe('true')
    expect(backdrop.className).toContain('-z-10')

    const source = picture.querySelector('source')!
    expect(source.getAttribute('media')).toBe('(min-width: 640px)')
    expect(source.getAttribute('srcset')).toContain(
      encodeURIComponent('/api/media/file/careers-1920x800.webp'),
    )
    // 通栏铺满（object-cover）：12:5 的横幅放进比它更“高”的框时按比例放大 sizes，挑够宽的候选
    expect(source.getAttribute('sizes')).toBe(
      '(min-width: 1280px) 100vw, (min-width: 1024px) 120vw, 150vw',
    )

    const img = picture.querySelector('img')!
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('src')).toContain(
      encodeURIComponent('/api/media/file/careers-mobile-750x1000.webp'),
    )
    expect(img.getAttribute('sizes')).toBe('100vw')
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(document.head.querySelector('link[rel="preload"]')).toBeNull()
    // 读屏只读到页面介绍：背景层不暴露任何图片
    expect(within(section).queryByRole('img')).toBeNull()
  })

  it('首屏遮罩：有活动卡片时 ≥ lg 自左向右渐变（图片在右侧露出），没有活动卡片时整体压暗', () => {
    renderView(pageData(), undefined, heroBanner())
    const scrim = () => hero().querySelector('picture')!.nextElementSibling as HTMLElement
    expect(scrim().className).toContain(CAREERS_HERO_SCRIM_CLASS.split)
    cleanup()

    renderView(pageData(), [], heroBanner())
    expect(scrim().className).toContain(CAREERS_HERO_SCRIM_CLASS.single)
    expect(scrim().className).not.toContain('bg-linear-to-r')
  })

  it('没有投放中的背景图：首屏是纯深色底，不输出图片', () => {
    renderView()
    expect(hero().querySelector('picture, img')).toBeNull()
    expect(hero().className).not.toContain('isolate')
    expect(hero().className).toContain('surface-dark')
  })

  it('首屏“预约就业咨询”：弹窗 position=careers_hero、意向 consult，标题与说明用后台行动号召文案', async () => {
    renderView()
    await act(async () => {
      fireEvent.click(within(hero()).getByRole('button', { name: '预约就业咨询' }))
    })
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: '预约一次就业咨询' })).toBeTruthy()
    expect(within(dialog).getByText('录用由企业自主决定。')).toBeTruthy()
    const form = dialog.querySelector('form')!
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('consult')
    expect(form.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'careers_hero',
    )
  })

  it('没有近期活动时首屏不显示提示卡片，招聘活动区块显示空状态并链接到页尾表单', () => {
    renderView(pageData(), [])
    expect(within(hero()).queryByText('最近一场活动')).toBeNull()
    const events = byId('careers-events')
    expect(within(events).getByRole('heading', { level: 2, name: '招聘活动' })).toBeTruthy()
    expect(within(events).getByText(zh.careers.events.empty)).toBeTruthy()
    expect(
      within(events)
        .getByRole('link', { name: /预约就业咨询/ })
        .getAttribute('href'),
    ).toBe('#careers-cta')
    expect(events.querySelector('article')).toBeNull()
  })

  it('服务流程：有序列表，步骤名称为 h3，序号只作装饰', () => {
    renderView()
    const section = byId('careers-process')
    expect(within(section).getByText('Process')).toBeTruthy()
    const items = within(section.querySelector('ol')!).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByRole('heading', { level: 3, name: '作品集打磨' })).toBeTruthy()
    expect(within(items[0]!).getByText('01').getAttribute('aria-hidden')).toBe('true')
    expect(within(items[1]!).getByText('02')).toBeTruthy()
    expect(items[1]!.querySelector('p')).toBeNull()
  })

  it('学员故事：化名卡片 + 化名说明；有正文的可展开阅读（读屏名称带化名，正文标题降到 h4），没有正文的不显示展开', () => {
    renderView()
    const section = byId('careers-stories')
    expect(within(section).getByRole('list', { name: '学员故事' })).toBeTruthy()
    expect(within(section).getByRole('heading', { level: 3, name: '小鹿' })).toBeTruthy()
    expect(within(section).getByText(zh.careers.stories.pseudonymNote)).toBeTruthy()

    const details = section.querySelectorAll('details')
    expect(details).toHaveLength(1)
    const summary = details[0]!.querySelector('summary')!
    expect(summary.textContent).toContain('阅读完整故事')
    expect(summary.querySelector('.sr-only')?.textContent).toBe('：小鹿')
    expect(details[0]!.open).toBe(false)
    expect(within(details[0]!).getByRole('heading', { level: 4, name: '转行的起点' })).toBeTruthy()
    expect(within(details[0]!).getByText('她在贸易公司做了四年财务。')).toBeTruthy()

    const second = within(section)
      .getByRole('heading', { level: 3, name: '沐沐' })
      .closest('article')!
    expect(second.querySelector('details')).toBeNull()
  })

  it('合作企业：Logo 墙，alt 为企业名称，不链接', () => {
    renderView()
    const section = byId('careers-partners')
    expect(within(section).getByRole('img', { name: '青岚互动' })).toBeTruthy()
    expect(within(section).queryByRole('link')).toBeNull()
  })

  it('招聘活动卡片：时间（北京时间）、名称 h3、地点、举办校区链接与地址、说明、报名方式', () => {
    renderView()
    const card = byId('career-event-31')
    expect(card.getAttribute('aria-labelledby')).toBe('career-event-31-title')
    expect(within(card).getByRole('heading', { level: 3, name: '作品集评审日' })).toBeTruthy()
    expect(within(card).getByText('2026年12月14日 14:00').getAttribute('dateTime')).toBe(
      '2026-12-14T06:00:00.000Z',
    )
    const value = (label: string) =>
      within(card).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement
    expect(value('地点').textContent).toBe('上海徐汇校区 5 层评图室')
    expect(
      within(value('举办校区')).getByRole('link', { name: '上海徐汇校区' }).getAttribute('href'),
    ).toBe('/campuses/shanghai-xuhui')
    expect(within(value('举办校区')).getByText('上海市徐汇区示例路 2 号')).toBeTruthy()
    expect(within(card).getByRole('img', { name: '作品集评审日' })).toBeTruthy()
    expect(within(card).getByText('报名方式')).toBeTruthy()
    expect(within(card).getByText('提前在校区前台登记。')).toBeTruthy()
  })

  it('线上活动（没有校区、没有图片）：只显示地点，不输出校区与图片', () => {
    renderView(pageData(), [
      event({ id: 5, location: '线上直播', campus: null, image: null, registrationNote: null }),
    ])
    const card = byId('career-event-5')
    expect(within(card).getByText('线上直播')).toBeTruthy()
    expect(within(card).queryByText('举办校区')).toBeNull()
    expect(within(card).queryByRole('img')).toBeNull()
    expect(within(card).queryByText('报名方式')).toBeNull()
  })

  it('后台描述为空时招聘活动区块标题下显示系统说明；关闭的区块整块不渲染', () => {
    renderView(pageData({ process: null, stories: null, partners: null }))
    expect(document.getElementById('careers-process')).toBeNull()
    expect(document.getElementById('careers-stories')).toBeNull()
    expect(document.getElementById('careers-partners')).toBeNull()
    expect(within(byId('careers-events')).getByText(zh.careers.page.eventsNote)).toBeTruthy()
  })

  it('招聘活动区块关闭：不渲染区块，首屏也不显示活动提示', () => {
    renderView(pageData({ events: null }), [event()])
    expect(document.getElementById('careers-events')).toBeNull()
    expect(within(hero()).queryByText('最近一场活动')).toBeNull()
  })

  it('结尾行动号召：深色区块（data-page-end-cta），页内表单 position=careers_cta、意向 consult', () => {
    renderView()
    const cta = byId('careers-cta')
    expect(cta.hasAttribute('data-page-end-cta')).toBe(true)
    expect(cta.className).toContain('surface-dark')
    expect(within(cta).getByRole('heading', { level: 2, name: '预约一次就业咨询' })).toBeTruthy()
    expect(cta.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe('careers_cta')
    expect(cta.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('consult')
  })

  it('广告法：页面（含展开前的故事正文）与就业服务页系统文案都不出现就业率、薪资、保证等表述', () => {
    renderView()
    expect(document.body.textContent).not.toMatch(BANNED)
    expect(JSON.stringify(zh.careers)).not.toMatch(BANNED)
  })
})
