// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadFormConfig } from '@/components/lead/types'
import type {
  CampusCardData,
  CampusCohortItem,
  CampusDetail,
  CampusPagesSettings,
  CampusPhoto,
} from '@/lib/campuses/types'

import { cohortItem, courseCard } from '../helpers/course-fixtures'
import { teacherListItem } from '../helpers/work-fixtures'

/**
 * 校区列表 / 详情页（jsdom）：区块取舍与底色、灯箱序列、页面标题 / 描述兜底、结构化数据，
 * 以及首屏概况与地图外链、近期开班按日期过滤、结尾表单的来源。
 * 真实数据、响应式与线索入库由 e2e（tests/e2e/campuses.e2e.spec.ts）覆盖。
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
const { CampusDetailView } = await import('@/components/campuses/campus-detail-view')
const { CampusList } = await import('@/components/campuses/campus-list')
const { CampusCard } = await import('@/components/campuses/campus-card')
const layout = await import('@/components/campuses/campus-layout')
const { campusJsonLd } = await import('@/components/campuses/campus-json-ld')

const leadConfig: LeadFormConfig = {
  disciplines: [{ id: 7, name: '三维动画' }],
  cities: ['北京'],
  successTitle: '提交成功',
  successMessage: '',
  wechatId: null,
  wechatQr: null,
  hotline: null,
}

const settings: CampusPagesSettings = {
  list: { title: '校区分布', description: null, seo: null },
  detail: { ctaTitle: '预约到校参观', ctaDescription: '课程顾问会与你确认到访时间。' },
}

/** 北京时间 2026-11-23 10:00 */
const NOW = new Date('2026-11-23T02:00:00.000Z')

const AMAP = 'https://uri.amap.com/marker?position=116.31,39.98&name=%E5%8C%97%E4%BA%AC'
const BAIDU =
  'https://api.map.baidu.com/marker?location=39.98,116.31&title=x&content=y&output=html&coord_type=gcj02&src=webapp.eduverse.site'

const photo = (n: number, caption: string | null = `照片 ${n}`): CampusPhoto => ({
  image: { src: `/api/media/file/p${n}-1920x1440.webp`, alt: '', width: 1920, height: 1440 },
  thumb: { src: `/api/media/file/p${n}-400x300.webp`, alt: '', width: 400, height: 300 },
  caption,
})

const campusCohort = (overrides: Partial<CampusCohortItem> = {}): CampusCohortItem => ({
  ...cohortItem(),
  course: { id: 11, slug: '3d-animation-career', title: '三维动画设计长期就业班', disciplineId: 7 },
  ...overrides,
})

function campusCardData(overrides: Partial<CampusCardData> = {}): CampusCardData {
  return {
    id: 1,
    name: '北京海淀校区',
    slug: 'beijing-haidian',
    city: '北京',
    address: '北京市海淀区示例路 1 号',
    phone: '010-0000-0001',
    phoneHref: 'tel:01000000001',
    openingHours: '周一至周日 9:00–21:00',
    cover: { src: '/api/media/file/c-800x450.webp', alt: '', width: 800, height: 450 },
    mapUrl: AMAP,
    ...overrides,
  }
}

function campusDetail(overrides: Partial<CampusDetail> = {}): CampusDetail {
  return {
    ...campusCardData(),
    heroImage: { src: '/api/media/file/c-1920x1080.webp', alt: '', width: 1920, height: 1080 },
    shareImage: { src: '/api/media/file/c-1200x630.webp', alt: '', width: 1200, height: 630 },
    transit: '地铁 4 号线魏公村站 A 口\n步行约 8 分钟',
    location: { lat: 39.98, lng: 116.31 },
    baiduMapUrl: BAIDU,
    photos: [photo(1), photo(2), photo(3)],
    courses: [courseCard({ id: 11 })],
    cohorts: [
      // 已开班（北京时间 11 月 20 日）：渲染时去掉
      campusCohort({ id: 1, startDate: '2026-11-20T02:00:00.000Z' }),
      campusCohort({ id: 2, startDate: '2026-12-14T02:00:00.000Z' }),
      campusCohort({
        id: 3,
        startDate: '2027-01-09T02:00:00.000Z',
        course: {
          id: 12,
          slug: 'ui-design-career',
          title: 'UI/UX 设计长期就业班',
          disciplineId: 4,
        },
      }),
    ],
    teachers: [teacherListItem()],
    seo: {},
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

function renderDetail(data: CampusDetail) {
  return render(
    <LeadDialogProvider config={leadConfig}>
      <CampusDetailView campus={data} settings={settings} leadConfig={leadConfig} now={NOW} />
    </LeadDialogProvider>,
  )
}

const hero = () => document.getElementById('campus-title')!.closest('section')!
const region = (name: string) => screen.getByRole('region', { name })

describe('校区页面的纯函数', () => {
  it('区块取舍：环境照片、开设课程、讲师没有内容时不渲染，近期开班始终渲染', () => {
    expect(layout.campusSectionKeys(campusDetail())).toEqual([
      'photos',
      'courses',
      'cohorts',
      'teachers',
    ])
    expect(
      layout.campusSectionKeys(campusDetail({ photos: [], courses: [], teachers: [] })),
    ).toEqual(['cohorts'])
  })

  it('区块底色在白底 / 米色之间交替，缺区块时相邻区块仍不同色', () => {
    expect([
      ...layout.assignCampusSectionTones(['photos', 'courses', 'cohorts', 'teachers']),
    ]).toEqual([
      ['photos', 'light'],
      ['courses', 'paper'],
      ['cohorts', 'light'],
      ['teachers', 'paper'],
    ])
    expect([...layout.assignCampusSectionTones(['cohorts', 'teachers'])]).toEqual([
      ['cohorts', 'light'],
      ['teachers', 'paper'],
    ])
  })

  it('灯箱序列：占位图与页面网格用同一张大图（命中缓存），保留说明', () => {
    const items = layout.campusLightboxItems([photo(1), photo(2, null)])
    expect(items).toEqual([
      { image: photo(1).image, thumb: photo(1).image, caption: '照片 1' },
      { image: photo(2).image, thumb: photo(2).image, caption: null },
    ])
  })

  it('照片按钮的读屏名称：说明 → 替代文字 → 校区名', () => {
    expect(layout.campusPhotoLabel(photo(1, ' 前台接待区 '), '北京海淀校区')).toBe(
      '查看大图：前台接待区',
    )
    const withAlt = { ...photo(2, null), image: { ...photo(2).image, alt: '机房全景' } }
    expect(layout.campusPhotoLabel(withAlt, '北京海淀校区')).toBe('查看大图：机房全景')
    expect(layout.campusPhotoLabel(photo(3, '  '), '北京海淀校区')).toBe('查看大图：北京海淀校区')
  })

  it('移动端照片数为奇数时第一张占满一行', () => {
    expect(layout.isWidePhoto(0, 3)).toBe(true)
    expect(layout.isWidePhoto(1, 3)).toBe(false)
    expect(layout.isWidePhoto(0, 4)).toBe(false)
    expect(layout.isWidePhoto(0, 1)).toBe(false)
  })

  it('城市数按城市名去重', () => {
    expect(
      layout.countCampusCities([
        { city: '北京' },
        { city: ' 北京 ' },
        { city: '上海' },
        { city: '' },
      ]),
    ).toBe(2)
  })

  it('页面标题 / 描述兜底：含校区名与地址，描述超长截断', () => {
    expect(layout.campusMetaTitle({ name: ' 北京海淀校区 ' })).toBe('北京海淀校区 · 地址与交通')
    expect(
      layout.campusMetaDescription({ name: '北京海淀校区', address: '北京市海淀区示例路 1 号' }),
    ).toBe(
      '北京海淀校区位于北京市海淀区示例路 1 号。查看交通指引、开放时间、开设课程与近期开班，预约到校参观。',
    )
    const long = layout.campusMetaDescription({ name: '校区', address: '路'.repeat(200) })
    expect(Array.from(long)).toHaveLength(120)
  })
})

describe('campusJsonLd', () => {
  it('EducationalOrganization：地址、电话、坐标（WGS 84）、分享图（绝对地址）、详情页地址与上级机构', () => {
    // 子路径部署：imageSource() 给出的媒体地址已带子路径
    const subpathCampus = campusDetail({
      shareImage: {
        src: '/EduVerse/api/media/file/c-1200x630.webp',
        alt: '',
        width: 1200,
        height: 630,
      },
    })
    expect(
      campusJsonLd(subpathCampus, {
        siteUrl: 'https://example.com/EduVerse',
        brandName: '数艺学院',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: '北京海淀校区',
      url: 'https://example.com/EduVerse/campuses/beijing-haidian',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '北京市海淀区示例路 1 号',
        addressLocality: '北京',
        addressCountry: 'CN',
      },
      telephone: '010-0000-0001',
      // 后台填写的高德坐标（GCJ-02）39.98, 116.31 换算为 WGS 84（schema.org 的坐标系），保留 6 位小数
      geo: { '@type': 'GeoCoordinates', latitude: 39.97873, longitude: 116.30391 },
      // 不会重复拼接子路径
      image: 'https://example.com/EduVerse/api/media/file/c-1200x630.webp',
      parentOrganization: {
        '@type': 'Organization',
        name: '数艺学院',
        url: 'https://example.com/EduVerse',
      },
    })
  })

  it('没有电话、坐标、图片时不输出对应字段；没有分享图时用首屏大图', () => {
    const data = campusJsonLd(
      campusDetail({ phone: null, location: null, shareImage: null, heroImage: null }),
      { siteUrl: 'https://example.com', brandName: '数艺学院' },
    )
    expect(data).not.toHaveProperty('telephone')
    expect(data).not.toHaveProperty('geo')
    expect(data).not.toHaveProperty('image')
    expect(
      campusJsonLd(campusDetail({ shareImage: null }), {
        siteUrl: 'https://example.com',
        brandName: '数艺学院',
      }).image,
    ).toBe('https://example.com/api/media/file/c-1920x1080.webp')
  })
})

describe('CampusDetailView', () => {
  it('首屏：面包屑经校区列表到当前校区，h1 为校区名，城市、地址、电话（tel:）、开放时间与交通指引', () => {
    renderView()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: '北京海淀校区' })).toBeTruthy()
    const breadcrumbs = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumbs).getByRole('link', { name: '校区分布' }).getAttribute('href')).toBe(
      '/campuses',
    )

    const h = within(hero())
    expect(h.getByText('北京', { exact: true })).toBeTruthy()
    const fact = (label: string) => h.getByText(label, { selector: 'dt' }).nextElementSibling!
    expect(fact('地址').textContent).toContain('北京市海淀区示例路 1 号')
    expect(
      within(fact('电话') as HTMLElement)
        .getByRole('link')
        .getAttribute('href'),
    ).toBe('tel:01000000001')
    expect(fact('开放时间').textContent).toBe('周一至周日 9:00–21:00')
    expect(fact('交通指引').textContent).toBe('地铁 4 号线魏公村站 A 口\n步行约 8 分钟')
    expect(fact('交通指引').querySelector('.whitespace-pre-line')).not.toBeNull()
    // 首屏大图是唯一预加载（不懒加载）的图片
    expect(h.getByRole('img').getAttribute('loading')).not.toBe('lazy')
  })

  it('地图外链：高德与百度，新窗口打开，读屏名称以可见文字开头；没有坐标时整组不显示', () => {
    renderView()
    const maps = within(hero()).getByRole('list', { name: '地图导航' })
    const amap = within(maps).getByRole('link', {
      name: '在高德地图中打开：北京海淀校区（在新窗口打开）',
    })
    const baidu = within(maps).getByRole('link', {
      name: '在百度地图中打开：北京海淀校区（在新窗口打开）',
    })
    expect(amap.getAttribute('href')).toBe(AMAP)
    expect(baidu.getAttribute('href')).toBe(BAIDU)
    for (const link of [amap, baidu]) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
    cleanup()

    renderView({ mapUrl: null, baiduMapUrl: null, location: null })
    expect(within(hero()).queryByRole('list', { name: '地图导航' })).toBeNull()
  })

  it('没有电话、开放时间、交通指引时不显示这几项', () => {
    renderView({ phone: null, phoneHref: null, openingHours: null, transit: null })
    const dts = [...hero().querySelectorAll('dt')].map((dt) => dt.textContent)
    expect(dts).toEqual(['地址'])
  })

  it('“预约到校参观”打开留资弹窗（campus_hero，intent consult），标题与说明来自后台设置', async () => {
    renderView()
    within(hero()).getByRole('button', { name: '预约到校参观' }).click()
    const dialog = await screen.findByRole('dialog', { name: '预约到校参观' })
    expect(within(dialog).getByText('课程顾问会与你确认到访时间。')).toBeTruthy()
    expect(dialog.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'campus_hero',
    )
    expect(dialog.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('consult')
  })

  it('环境照片：每张一个“查看大图”按钮与说明，按钮在水合前不可点', () => {
    renderView()
    const photos = region('校区环境')
    expect(within(photos).getByText('共 3 张照片，点击可查看大图')).toBeTruthy()
    const buttons = within(photos).getAllByRole('button', { name: /^查看大图：/ })
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      '查看大图：照片 1',
      '查看大图：照片 2',
      '查看大图：照片 3',
    ])
    expect([...photos.querySelectorAll('figcaption')].map((node) => node.textContent)).toEqual([
      '照片 1',
      '照片 2',
      '照片 3',
    ])
    // 网格图与灯箱占位图同一个地址，全部懒加载
    for (const img of photos.querySelectorAll('img')) {
      expect(img.getAttribute('loading')).toBe('lazy')
    }
  })

  it('区块标题都是 h2，按页面顺序；中间区块白底 / 米色交替，结尾行动号召深色', () => {
    renderView()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '校区环境',
      '开设课程',
      '近期开班',
      '本校区讲师',
      '预约到校参观',
    ])
    expect(region('校区环境').className).toContain('surface-light')
    expect(region('开设课程').className).toContain('surface-paper')
    expect(region('近期开班').className).toContain('surface-light')
    expect(region('本校区讲师').className).toContain('surface-paper')
  })

  it('开设课程：课程卡片链接到课程详情，附“查看全部课程”', () => {
    renderView()
    const courses = region('开设课程')
    expect(within(courses).getByText('共 1 门课程在本校区开课')).toBeTruthy()
    expect(
      within(courses)
        .getByRole('heading', { level: 3, name: '三维动画设计长期就业班' })
        .querySelector('a')
        ?.getAttribute('href'),
    ).toBe('/courses/3d-animation-career')
    expect(
      within(courses)
        .getByRole('link', { name: /查看全部课程/ })
        .getAttribute('href'),
    ).toBe('/courses')
  })

  it('近期开班：按北京时间去掉已开班的；每行显示课程（链接到课程），不再链接本校区；预约试听带上该行课程', async () => {
    renderView()
    const rows = within(region('近期开班')).getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('p')?.textContent)).toEqual([
      '2026年12月14日',
      '2027年1月9日',
    ])
    for (const row of rows) {
      const hrefs = [...row.querySelectorAll('a')].map((a) => a.getAttribute('href'))
      expect(hrefs).toHaveLength(1)
      expect(hrefs[0]).toMatch(/^\/courses\//)
    }
    within(rows[1]!)
      .getByRole('button', { name: /^预约试听/ })
      .click()
    const dialog = await screen.findByRole('dialog', { name: '预约免费试听' })
    expect(dialog.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe(
      'campus_cohort',
    )
    expect(dialog.querySelector<HTMLInputElement>('input[name="course"]')?.value).toBe('12')
  })

  it('没有未开班的计划时显示空状态，引导预约到校参观', () => {
    renderView({ cohorts: [campusCohort({ startDate: '2026-11-01T02:00:00.000Z' })] })
    const cohorts = region('近期开班')
    expect(within(cohorts).queryAllByRole('listitem')).toHaveLength(0)
    expect(within(cohorts).getByText(/本校区近期暂无开班安排/)).toBeTruthy()
    // 没有开班时不显示“按北京时间”的说明
    expect(within(cohorts).queryByText(/开班日期按北京时间计/)).toBeNull()
  })

  it('本校区讲师：讲师卡片链接到讲师详情，附“查看全部讲师”；没有讲师 / 课程 / 照片时整块不渲染', () => {
    renderView()
    const teachers = region('本校区讲师')
    expect(within(teachers).getByText('共 1 位讲师')).toBeTruthy()
    expect(within(teachers).getByRole('link', { name: '林雨晴' }).getAttribute('href')).toBe(
      '/teachers/lin-yu-qing',
    )
    expect(
      within(teachers)
        .getByRole('link', { name: /查看全部讲师/ })
        .getAttribute('href'),
    ).toBe('/teachers')
    cleanup()

    renderView({ teachers: [], courses: [], photos: [] })
    expect(screen.queryByRole('region', { name: '本校区讲师' })).toBeNull()
    expect(screen.queryByRole('region', { name: '开设课程' })).toBeNull()
    expect(screen.queryByRole('region', { name: '校区环境' })).toBeNull()
    // 剩下的近期开班从白底开始
    expect(region('近期开班').className).toContain('surface-light')
  })

  it('结尾行动号召：标题与说明来自后台设置，表单 position=campus_cta、intent=consult，标记页面以表单收尾', () => {
    renderView()
    const cta = document.getElementById('campus-cta')!
    expect(cta.hasAttribute('data-page-end-cta')).toBe(true)
    expect(cta.className).toContain('surface-dark')
    expect(within(cta).getByRole('heading', { level: 2 }).textContent).toBe('预约到校参观')
    expect(within(cta).getByText('课程顾问会与你确认到访时间。')).toBeTruthy()
    expect(cta.querySelector<HTMLInputElement>('input[name="position"]')?.value).toBe('campus_cta')
    expect(cta.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe('consult')
  })
})

describe('CampusList', () => {
  const campuses = [
    campusCardData(),
    campusCardData({
      id: 2,
      name: '上海徐汇校区',
      slug: 'shanghai-xuhui',
      city: '上海',
      phone: null,
      phoneHref: null,
      mapUrl: null,
    }),
  ]

  it('概要、校区名（h2）、城市标签、电话与“在高德地图中打开”；只有第一张封面预加载', () => {
    render(<CampusList campuses={campuses} />)
    expect(screen.getByText('共 2 个校区，分布在 2 个城市')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '北京海淀校区',
      '上海徐汇校区',
    ])
    const [first, second] = screen.getAllByRole('article')
    expect(within(first!).getByText('北京', { exact: true })).toBeTruthy()
    expect(within(first!).getByRole('link', { name: '010-0000-0001' }).getAttribute('href')).toBe(
      'tel:01000000001',
    )
    const map = within(first!).getByRole('link', {
      name: '在高德地图中打开：北京海淀校区（在新窗口打开）',
    })
    expect(map.textContent).toBe('在高德地图中打开')
    expect(map.getAttribute('href')).toBe(AMAP)
    expect(
      within(first!).getByRole('link', { name: '查看校区：北京海淀校区' }).getAttribute('href'),
    ).toBe('/campuses/beijing-haidian')
    // 没有坐标的校区不显示地图链接，没有电话不显示电话
    expect(within(second!).queryByRole('link', { name: /地图/ })).toBeNull()
    expect(within(second!).queryByText('电话')).toBeNull()

    expect(first!.querySelector('img')?.getAttribute('loading')).not.toBe('lazy')
    expect(second!.querySelector('img')?.getAttribute('loading')).toBe('lazy')
  })

  it('没有校区时显示空状态，引导查看专业课程', () => {
    render(<CampusList campuses={[]} />)
    const empty = screen.getByRole('region', { name: '校区信息正在整理中' })
    expect(within(empty).getByRole('link', { name: '查看专业课程' }).getAttribute('href')).toBe(
      '/courses',
    )
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('首页用的默认卡片不显示城市标签，地图链接保持“在地图中打开”', () => {
    render(<CampusCard campus={campusCardData()} imageSizes="400px" />)
    const card = screen.getByRole('article')
    expect(within(card).queryByText('北京', { exact: true })).toBeNull()
    expect(
      within(card).getByRole('link', {
        name: '在地图中打开：北京海淀校区（高德地图，在新窗口打开）',
      }).textContent,
    ).toBe('在地图中打开')
  })
})

function renderView(overrides: Partial<CampusDetail> = {}) {
  return renderDetail(campusDetail(overrides))
}
