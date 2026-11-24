import { afterEach, describe, expect, it, vi } from 'vitest'

import { TUTORIAL_LEVEL_OPTIONS, TUTORIAL_PROVIDER_OPTIONS } from '@/collections/Tutorials'
import { zh } from '@/i18n/zh'
import {
  isTutorialLevel,
  TUTORIAL_LEVELS,
  tutorialLevelLabel,
  tutorialProviderLabel,
} from '@/lib/tutorials/format'
import {
  buildTutorialFilterRows,
  filterTutorials,
  findTutorial,
  hasActiveTutorialFilters,
  parseTutorialFilters,
  tutorialFilterHref,
  tutorialListHref,
} from '@/lib/tutorials/filters'
import { toTutorialCard, type TutorialSource } from '@/lib/tutorials/mappers'
import {
  parseTutorialId,
  TUTORIAL_PLAY_PARAM,
  TUTORIALS_PATH,
  tutorialPlayHref,
} from '@/lib/tutorials/paths'
import {
  parseUnlockedTutorialIds,
  readTutorialGatePassed,
  readUnlockedTutorialIds,
  rememberTutorialGatePassed,
  rememberUnlockedTutorial,
  TUTORIAL_GATE_PASSED_STORAGE_KEY,
  TUTORIAL_UNLOCK_STORAGE_KEY,
} from '@/lib/tutorials/storage'
import { BILIBILI_BV_PATTERN, tutorialEmbedUrl } from '@/lib/tutorials/video'
import type { TutorialCardData } from '@/lib/tutorials/types'
import { isAllowedVideoEmbedUrl } from '@/lib/works/video'
import type { Discipline, Media } from '@/payload-types'

import { ANIMATION, GAME, UI } from '../helpers/work-fixtures'

import { tutorials as seedTutorials } from '../../scripts/seed/data/tutorials'

const BV = 'BV1ED00000a1'

describe('tutorialEmbedUrl：教程播放器地址', () => {
  it('哔哩哔哩 BV 号 → 官方外链播放器地址，且在作品视频白名单内', () => {
    const url = tutorialEmbedUrl('bilibili', BV)
    expect(url).toBe(`https://player.bilibili.com/player.html?bvid=${BV}`)
    expect(isAllowedVideoEmbedUrl(url)).toBe(true)
  })

  it('去掉首尾空白后再校验', () => {
    expect(tutorialEmbedUrl('bilibili', `  ${BV}\n`)).toBe(
      `https://player.bilibili.com/player.html?bvid=${BV}`,
    )
  })

  it('平台不受支持、视频 ID 不合法或类型不对时返回 null（前台显示“视频暂不可用”）', () => {
    for (const [provider, id] of [
      ['youtube', BV],
      [undefined, BV],
      ['bilibili', ''],
      ['bilibili', 'BV123'],
      ['bilibili', `${BV}x`],
      ['bilibili', 'av170001'],
      ['bilibili', 'BV1ED00000a1&autoplay=1'],
      ['bilibili', 'BV1ED0000"><script>'],
      ['bilibili', 'https://evil.example.com/BV1ED00000a1'],
      ['bilibili', 42],
      ['bilibili', null],
    ] as const) {
      expect(tutorialEmbedUrl(provider, id), `${String(provider)} ${String(id)}`).toBeNull()
    }
  })

  it('BV 号规则：BV + 10 位字母数字', () => {
    expect(BILIBILI_BV_PATTERN.test(BV)).toBe(true)
    expect(BILIBILI_BV_PATTERN.test('BV1xx411c7XX')).toBe(true)
    expect(BILIBILI_BV_PATTERN.test('bv1xx411c7XX')).toBe(false)
    expect(BILIBILI_BV_PATTERN.test('BV1xx411c7X')).toBe(false)
    expect(BILIBILI_BV_PATTERN.test('BV1xx411c7X-')).toBe(false)
  })

  it('种子教程的视频 ID 都能构造出白名单内的播放器地址', () => {
    for (const tutorial of seedTutorials) {
      expect(tutorialEmbedUrl('bilibili', tutorial.videoId), tutorial.slug).not.toBeNull()
    }
  })
})

describe('教程路径与 ?play= 参数', () => {
  it('列表页与播放弹窗深链接', () => {
    expect(TUTORIALS_PATH).toBe('/tutorials')
    expect(TUTORIAL_PLAY_PARAM).toBe('play')
    expect(tutorialPlayHref(12)).toBe('/tutorials?play=12')
  })

  it('只接受不带前导 0 的正整数，且不超过数据库整数上限', () => {
    expect(parseTutorialId('12')).toBe(12)
    expect(parseTutorialId('2147483647')).toBe(2_147_483_647)
    for (const value of [
      undefined,
      null,
      '',
      '0',
      '012',
      '-3',
      '1.5',
      '1e3',
      'abc',
      ' 12',
      '2147483648',
      '99999999999',
    ]) {
      expect(parseTutorialId(value), String(value)).toBeNull()
    }
  })
})

describe('教程难度与平台的显示文字', () => {
  it('与后台选项标签一致，筛选顺序与后台选项顺序一致', () => {
    expect(TUTORIAL_LEVELS).toEqual(TUTORIAL_LEVEL_OPTIONS.map((option) => option.value))
    for (const option of TUTORIAL_LEVEL_OPTIONS) {
      expect(zh.tutorials.levels[option.value as keyof typeof zh.tutorials.levels]).toBe(
        option.label,
      )
    }
    expect(Object.keys(zh.tutorials.levels)).toEqual(
      TUTORIAL_LEVEL_OPTIONS.map((option) => option.value),
    )
    for (const option of TUTORIAL_PROVIDER_OPTIONS) {
      expect(zh.tutorials.providers[option.value as keyof typeof zh.tutorials.providers]).toBe(
        option.label,
      )
    }
    expect(Object.keys(zh.tutorials.providers)).toEqual(
      TUTORIAL_PROVIDER_OPTIONS.map((option) => option.value),
    )
  })

  it('取值合法性与显示文字', () => {
    expect(isTutorialLevel('advanced')).toBe(true)
    for (const value of ['expert', '', null, undefined, 1]) {
      expect(isTutorialLevel(value)).toBe(false)
    }
    expect(tutorialLevelLabel('intermediate')).toBe('进阶')
    expect(tutorialProviderLabel('bilibili')).toBe('哔哩哔哩')
  })
})

describe('已解锁教程的本地记录', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** 内存版 localStorage；throwing 为 true 时每次读写都抛错（隐私模式 / 被禁用） */
  function stubStorage(initial: Record<string, string> = {}, throwing = false) {
    const store = new Map(Object.entries(initial))
    const fail = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => (throwing ? fail() : (store.get(key) ?? null)),
        setItem: (key: string, value: string) => (throwing ? fail() : store.set(key, value)),
      },
    })
    return store
  }

  it('解析：只保留正整数 ID，去重；格式不对按空列表处理', () => {
    expect(parseUnlockedTutorialIds(null)).toEqual([])
    expect(parseUnlockedTutorialIds('')).toEqual([])
    expect(parseUnlockedTutorialIds('{')).toEqual([])
    expect(parseUnlockedTutorialIds('{"a":1}')).toEqual([])
    expect(parseUnlockedTutorialIds('[3,"4",0,-1,1.5,3,null,5]')).toEqual([3, 5])
  })

  it('解析：最多保留最近的 200 个', () => {
    const ids = Array.from({ length: 250 }, (_, i) => i + 1)
    const parsed = parseUnlockedTutorialIds(JSON.stringify(ids))
    expect(parsed).toHaveLength(200)
    expect(parsed[0]).toBe(51)
    expect(parsed.at(-1)).toBe(250)
  })

  it('记录后能读回；重复记录移到末尾（最近解锁）', () => {
    const store = stubStorage()
    expect(readUnlockedTutorialIds()).toEqual([])
    expect(rememberUnlockedTutorial(7)).toEqual([7])
    expect(rememberUnlockedTutorial(9)).toEqual([7, 9])
    expect(rememberUnlockedTutorial(7)).toEqual([9, 7])
    expect(store.get(TUTORIAL_UNLOCK_STORAGE_KEY)).toBe('[9,7]')
    expect(readUnlockedTutorialIds()).toEqual([9, 7])
  })

  it('存储被改写成非法内容时按空列表处理，记录时覆盖掉', () => {
    const store = stubStorage({ [TUTORIAL_UNLOCK_STORAGE_KEY]: 'not json' })
    expect(readUnlockedTutorialIds()).toEqual([])
    expect(rememberUnlockedTutorial(3)).toEqual([3])
    expect(store.get(TUTORIAL_UNLOCK_STORAGE_KEY)).toBe('[3]')
  })

  it('存储不可用（读写抛错）时不抛出：读取为空，记录只返回内存结果', () => {
    stubStorage({}, true)
    expect(readUnlockedTutorialIds()).toEqual([])
    expect(rememberUnlockedTutorial(5)).toEqual([5])
  })

  it('“已留资”标记：默认没有；记下后能读回（与逐个教程的记录分开存）', () => {
    const store = stubStorage({ [TUTORIAL_UNLOCK_STORAGE_KEY]: '[3]' })
    expect(readTutorialGatePassed()).toBe(false)
    expect(rememberTutorialGatePassed()).toBe(true)
    expect(readTutorialGatePassed()).toBe(true)
    expect(store.get(TUTORIAL_GATE_PASSED_STORAGE_KEY)).toBe('1')
    expect(store.get(TUTORIAL_UNLOCK_STORAGE_KEY)).toBe('[3]')
  })

  it('“已留资”标记：值不对时视为没有；存储不可用时不抛出，记录返回 false（由调用方记在内存里）', () => {
    stubStorage({ [TUTORIAL_GATE_PASSED_STORAGE_KEY]: 'yes' })
    expect(readTutorialGatePassed()).toBe(false)
    vi.unstubAllGlobals()
    stubStorage({}, true)
    expect(readTutorialGatePassed()).toBe(false)
    expect(rememberTutorialGatePassed()).toBe(false)
  })
})

describe('toTutorialCard：教程卡片映射', () => {
  const cover = {
    id: 1,
    alt: '封面',
    url: '/api/media/file/cover.webp',
    width: 1600,
    height: 900,
    sizes: {
      card: { url: '/api/media/file/cover-800x450.webp', width: 800, height: 450 },
      og: { url: '/api/media/file/cover-1200x630.webp', width: 1200, height: 630 },
    },
  } as unknown as Media

  const discipline = (status: 'draft' | 'published') =>
    ({
      id: 4,
      name: '游戏美术',
      shortName: '游戏',
      slug: 'game-art',
      _status: status,
    }) as unknown as Discipline

  const source = (overrides: Partial<TutorialSource> = {}): TutorialSource => ({
    id: 11,
    title: '风格化道具材质',
    slug: 'stylized-prop',
    description: '  在 Painter 中制作手绘风格材质。 ',
    cover,
    discipline: discipline('published'),
    level: 'intermediate',
    provider: 'bilibili',
    videoId: BV,
    duration: ' 21:05 ',
    gated: true,
    createdAt: '2026-11-01T02:00:00.000Z',
    ...overrides,
  })

  it('映射卡片字段：封面用 card 尺寸、分享图用 og 裁切，播放器地址按白名单构造，文字去掉首尾空白', () => {
    expect(toTutorialCard(source())).toEqual({
      id: 11,
      slug: 'stylized-prop',
      title: '风格化道具材质',
      description: '在 Painter 中制作手绘风格材质。',
      cover: { src: '/api/media/file/cover-800x450.webp', alt: '封面', width: 800, height: 450 },
      shareImage: {
        src: '/api/media/file/cover-1200x630.webp',
        alt: '封面',
        width: 1200,
        height: 630,
      },
      discipline: { id: 4, name: '游戏美术', shortName: '游戏', slug: 'game-art' },
      level: 'intermediate',
      provider: 'bilibili',
      videoId: BV,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${BV}`,
      duration: '21:05',
      gated: true,
      addedAt: '2026-11-01T02:00:00.000Z',
    })
  })

  it('专业方向未发布或未填充时为 null；难度缺失按入门；gated 只认 true', () => {
    const card = toTutorialCard(
      source({ discipline: discipline('draft'), level: null, gated: null }),
    )
    expect(card.discipline).toBeNull()
    expect(card.level).toBe('beginner')
    expect(card.gated).toBe(false)
    expect(toTutorialCard(source({ discipline: 4 })).discipline).toBeNull()
    expect(toTutorialCard(source({ discipline: null })).discipline).toBeNull()
  })

  it('视频 ID 不合法（历史数据 / 绕过校验写入）时 embedUrl 为 null；空简介、空时长为 null', () => {
    const card = toTutorialCard(
      source({ videoId: 'javascript:alert(1)', description: '  ', duration: null }),
    )
    expect(card.embedUrl).toBeNull()
    expect(card.description).toBeNull()
    expect(card.duration).toBeNull()
  })

  it('封面未填充时封面与分享图都为 null', () => {
    const card = toTutorialCard(source({ cover: 1 }))
    expect(card.cover).toBeNull()
    expect(card.shareImage).toBeNull()
  })
})

describe('教程列表筛选', () => {
  const card = (
    id: number,
    discipline: TutorialCardData['discipline'],
    level: TutorialCardData['level'],
  ): TutorialCardData => ({
    id,
    slug: `tutorial-${id}`,
    title: `教程 ${id}`,
    description: null,
    cover: null,
    shareImage: null,
    discipline,
    level,
    provider: 'bilibili',
    videoId: BV,
    embedUrl: `https://player.bilibili.com/player.html?bvid=${BV}`,
    duration: null,
    gated: false,
    addedAt: '2026-11-01T02:00:00.000Z',
  })
  const LIST = [
    card(1, ANIMATION, 'beginner'),
    card(2, ANIMATION, 'advanced'),
    card(3, GAME, 'beginner'),
    card(4, null, 'intermediate'),
  ]
  const facets = { disciplines: [ANIMATION, GAME, UI] }

  it('解析参数：非法取值忽略；出现筛选或 play 参数（不论是否合法）时 noindex', () => {
    expect(parseTutorialFilters({})).toEqual({
      filters: {},
      playId: null,
      hasFilterParams: false,
      noindex: false,
    })
    expect(
      parseTutorialFilters({ discipline: ' 3d-animation ', level: 'advanced', play: '12' }),
    ).toEqual({
      filters: { discipline: '3d-animation', level: 'advanced' },
      playId: 12,
      hasFilterParams: true,
      noindex: true,
    })
    expect(parseTutorialFilters({ discipline: 'Bad Slug', level: 'expert' })).toEqual({
      filters: {},
      playId: null,
      hasFilterParams: true,
      noindex: true,
    })
    expect(parseTutorialFilters(new URLSearchParams('play=abc'))).toEqual({
      filters: {},
      playId: null,
      hasFilterParams: false,
      noindex: true,
    })
    expect(parseTutorialFilters({ level: ['intermediate', 'advanced'] }).filters).toEqual({
      level: 'intermediate',
    })
  })

  it('过滤：各维度同时满足，保持原顺序；未发布方向的教程不匹配任何专业方向', () => {
    expect(filterTutorials(LIST, {}).map((t) => t.id)).toEqual([1, 2, 3, 4])
    expect(filterTutorials(LIST, { discipline: '3d-animation' }).map((t) => t.id)).toEqual([1, 2])
    expect(filterTutorials(LIST, { level: 'beginner' }).map((t) => t.id)).toEqual([1, 3])
    expect(
      filterTutorials(LIST, { discipline: '3d-animation', level: 'beginner' }).map((t) => t.id),
    ).toEqual([1])
    expect(filterTutorials(LIST, { discipline: 'unknown' })).toEqual([])
    expect(hasActiveTutorialFilters({})).toBe(false)
    expect(hasActiveTutorialFilters({ level: 'advanced' })).toBe(true)
  })

  it('?play= 在全部教程里查找（不受筛选影响），找不到为 null', () => {
    expect(findTutorial(LIST, 3)?.id).toBe(3)
    expect(findTutorial(LIST, 99)).toBeNull()
    expect(findTutorial(LIST, null)).toBeNull()
  })

  it('链接：参数顺序固定；切换筛选时去掉 play，再点一次当前项即取消', () => {
    expect(tutorialListHref({})).toBe('/tutorials')
    expect(tutorialListHref({ level: 'advanced', discipline: 'game-art' }, 5)).toBe(
      '/tutorials?discipline=game-art&level=advanced&play=5',
    )
    const filters = { discipline: 'game-art', level: 'beginner' } as const
    expect(tutorialFilterHref(filters, 'level', 'advanced')).toBe(
      '/tutorials?discipline=game-art&level=advanced',
    )
    expect(tutorialFilterHref(filters, 'level', 'beginner')).toBe('/tutorials?discipline=game-art')
    expect(tutorialFilterHref(filters, 'discipline', undefined)).toBe('/tutorials?level=beginner')
  })

  it('筛选栏两行：只列出有教程的取值（选中的除外），数量按其它维度的当前选择计算', () => {
    const rows = buildTutorialFilterRows(LIST, { level: 'beginner' }, facets)
    expect(rows.map((row) => [row.key, row.label])).toEqual([
      ['discipline', zh.tutorials.filters.discipline],
      ['level', zh.tutorials.filters.level],
    ])
    const [discipline, level] = rows
    expect(discipline.options).toEqual([
      {
        label: ANIMATION.shortName,
        count: 1,
        href: '/tutorials?discipline=3d-animation&level=beginner',
        selected: false,
      },
      {
        label: GAME.shortName,
        count: 1,
        href: '/tutorials?discipline=game-art&level=beginner',
        selected: false,
      },
    ])
    expect(discipline).toMatchObject({
      allHref: '/tutorials?level=beginner',
      allCount: 2,
      allSelected: true,
    })
    expect(level.options.map((o) => [o.label, o.count, o.selected])).toEqual([
      ['入门', 2, true],
      ['进阶', 1, false],
      ['高阶', 1, false],
    ])
    expect(level).toMatchObject({ allHref: '/tutorials', allCount: 4, allSelected: false })
  })
})
