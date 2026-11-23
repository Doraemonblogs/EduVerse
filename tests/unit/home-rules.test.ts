import { describe, expect, it } from 'vitest'

import { HOME_PAGE_DEFAULTS } from '@/globals/home-page-defaults'
import { amapMarkerUrl, telHref } from '@/lib/home/map'
import {
  clampSetting,
  collectArticleCategories,
  countCoursesByDiscipline,
  HOME_LIMITS,
  isBannerLive,
  liveBanners,
  mergeUnique,
  pickByIds,
  pickCareerCourses,
  pickHomeTeachers,
  toSectionHeading,
} from '@/lib/home/rules'

import { courseCard, disciplineRef } from '../helpers/course-fixtures'

/**
 * 首页取数规则（纯函数）：区块开关与文字兜底、轮播图时间窗、指定内容的挑选、各区块的自动规则、
 * 校区联系方式链接。
 */

const NOW = new Date('2026-11-23T04:00:00.000Z')
const HOUR = 60 * 60 * 1000
const at = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * HOUR).toISOString()

describe('区块文字 toSectionHeading', () => {
  const defaults = HOME_PAGE_DEFAULTS.sections.courses

  it('后台关闭（enabled = false）时返回 null，整块不渲染', () => {
    expect(toSectionHeading({ enabled: false, title: '精选课程' }, defaults)).toBeNull()
  })

  it('从未保存过（undefined）时用默认标题与眉标，描述为空', () => {
    expect(toSectionHeading(undefined, defaults)).toEqual({
      eyebrow: defaults.eyebrow,
      title: defaults.title,
      description: null,
    })
    expect(toSectionHeading({ enabled: null }, defaults)?.title).toBe(defaults.title)
  })

  it('去掉首尾空白；后台清空的眉标与描述不显示，清空的标题回到默认值', () => {
    expect(
      toSectionHeading(
        { enabled: true, eyebrow: '  ', title: '  就业班  ', description: ' 说明 ' },
        defaults,
      ),
    ).toEqual({ eyebrow: null, title: '就业班', description: '说明' })
    expect(toSectionHeading({ eyebrow: null, title: '' }, defaults)).toEqual({
      eyebrow: null,
      title: defaults.title,
      description: null,
    })
  })
})

describe('数字设置 clampSetting', () => {
  const range = { fallback: 12, min: 4, max: 24 }

  it('没有填写或不是有限数时用默认值', () => {
    expect(clampSetting(null, range)).toBe(12)
    expect(clampSetting(undefined, range)).toBe(12)
    expect(clampSetting(Number.NaN, range)).toBe(12)
  })

  it('超出范围时取边界值，小数取整', () => {
    expect(clampSetting(1, range)).toBe(4)
    expect(clampSetting(99, range)).toBe(24)
    expect(clampSetting(7.6, range)).toBe(8)
  })
})

describe('轮播图时间窗', () => {
  it('没有开始 / 结束时间时一直展示', () => {
    expect(isBannerLive({ startAt: null, endAt: null }, NOW)).toBe(true)
  })

  it('开始时间不晚于当前时间才展示（开始那一刻起展示）', () => {
    expect(isBannerLive({ startAt: at(-1), endAt: null }, NOW)).toBe(true)
    expect(isBannerLive({ startAt: NOW.toISOString(), endAt: null }, NOW)).toBe(true)
    expect(isBannerLive({ startAt: at(1), endAt: null }, NOW)).toBe(false)
  })

  it('结束时间晚于当前时间才展示（结束那一刻起不再展示）', () => {
    expect(isBannerLive({ startAt: null, endAt: at(1) }, NOW)).toBe(true)
    expect(isBannerLive({ startAt: null, endAt: NOW.toISOString() }, NOW)).toBe(false)
    expect(isBannerLive({ startAt: at(-2), endAt: at(-1) }, NOW)).toBe(false)
  })

  it('接受时间戳；无法解析的时间按不限处理', () => {
    expect(isBannerLive({ startAt: at(-1), endAt: at(1) }, NOW.getTime())).toBe(true)
    expect(isBannerLive({ startAt: 'not-a-date', endAt: '' }, NOW)).toBe(true)
  })

  it('liveBanners 只保留时间窗内的，保持原顺序且不修改传入的数组', () => {
    const banners = [
      { id: 1, startAt: null, endAt: null },
      { id: 2, startAt: at(1), endAt: null },
      { id: 3, startAt: at(-1), endAt: at(1) },
      { id: 4, startAt: null, endAt: at(-1) },
    ]
    expect(liveBanners(banners, NOW).map((b) => b.id)).toEqual([1, 3])
    expect(banners).toHaveLength(4)
    // 一小时后：第 2 张开始、第 3 张结束
    expect(liveBanners(banners, new Date(NOW.getTime() + HOUR)).map((b) => b.id)).toEqual([1, 2])
  })

  it('liveBanners 最多 limit 张，先按时间窗过滤再截取（已结束的不占名额）', () => {
    const expired = Array.from({ length: HOME_LIMITS.banners }, (_, i) => ({
      id: i + 1,
      startAt: null,
      endAt: at(-1),
    }))
    const live = Array.from({ length: HOME_LIMITS.banners + 2 }, (_, i) => ({
      id: 100 + i,
      startAt: null,
      endAt: null,
    }))
    const result = liveBanners([...expired, ...live], NOW)
    expect(result).toHaveLength(HOME_LIMITS.banners)
    expect(result[0]?.id).toBe(100)
    expect(liveBanners(live, NOW, 2).map((b) => b.id)).toEqual([100, 101])
  })
})

describe('指定内容的挑选', () => {
  const pool = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  it('pickByIds 按指定顺序挑出，跳过不可用的（未发布 / 未授权 / 已删除）并去重', () => {
    expect(pickByIds(pool, [3, 9, 1, 3, 2]).map((item) => item.id)).toEqual([3, 1, 2])
  })

  it('pickByIds 最多 limit 个；全部不可用时为空（由调用方改走自动规则）', () => {
    expect(pickByIds(pool, [4, 3, 2, 1], 2).map((item) => item.id)).toEqual([4, 3])
    expect(pickByIds(pool, [7, 8])).toEqual([])
  })

  it('mergeUnique 按组的先后合并、按 ID 去重，最多 limit 个', () => {
    expect(
      mergeUnique(
        [
          [{ id: 2 }, { id: 5 }],
          [{ id: 5 }, { id: 1 }, { id: 3 }],
        ],
        3,
      ).map((i) => i.id),
    ).toEqual([2, 5, 1])
  })
})

describe('精选课程的自动规则', () => {
  const ui = disciplineRef({ id: 2, slug: 'ui-ux', name: 'UI/UX 设计', shortName: 'UI 设计' })
  const game = disciplineRef({ id: 3, slug: 'game-art', name: '游戏美术', shortName: '游戏美术' })
  // 已按“专业方向排序 → 课程排序”排好
  const cards = [
    courseCard({ id: 11, classType: 'short_term' }),
    courseCard({ id: 12, classType: 'long_term' }),
    courseCard({ id: 13, classType: 'long_term' }),
    courseCard({ id: 21, discipline: ui, classType: 'long_term' }),
    courseCard({ id: 31, discipline: game, classType: 'short_term' }),
  ]

  it('每个专业方向取排序最靠前的一门长期就业班，保持专业方向的顺序', () => {
    expect(pickCareerCourses(cards).map((card) => card.id)).toEqual([12, 21])
  })

  it('没有长期就业班的专业方向不出现；最多 limit 门', () => {
    expect(pickCareerCourses(cards, 1).map((card) => card.id)).toEqual([12])
    expect(pickCareerCourses([cards[0]!, cards[4]!])).toEqual([])
  })

  it('热门专业的课程数按专业方向统计', () => {
    const counts = countCoursesByDiscipline(cards)
    expect(counts.get(7)).toBe(3)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)
    expect(counts.get(99)).toBeUndefined()
  })
})

describe('讲师的自动规则', () => {
  const list = (...ids: number[]) => ids.map((id) => ({ id }))

  it('精选讲师在前，其余按排序补足到 4 位', () => {
    expect(pickHomeTeachers(list(5, 2), list(1, 3, 4, 6)).map((t) => t.id)).toEqual([5, 2, 1, 3])
  })

  it('精选正好 4 位时只取这 4 位', () => {
    expect(pickHomeTeachers(list(1, 2, 3, 4), list(5, 6)).map((t) => t.id)).toEqual([1, 2, 3, 4])
  })

  it('精选超过 4 位时补足到 8 位；精选超过 8 位时只取前 8 位', () => {
    expect(pickHomeTeachers(list(1, 2, 3, 4, 5, 6), list(7, 8, 9, 10))).toHaveLength(
      HOME_LIMITS.teachers.max,
    )
    expect(pickHomeTeachers(list(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), []).map((t) => t.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ])
  })

  it('没有精选讲师时按排序取 4 位；讲师不够时有多少取多少', () => {
    expect(pickHomeTeachers([], list(1, 2, 3, 4, 5)).map((t) => t.id)).toEqual([1, 2, 3, 4])
    expect(pickHomeTeachers(list(2), list(1)).map((t) => t.id)).toEqual([2, 1])
  })
})

describe('资讯分类 collectArticleCategories', () => {
  it('去重后按分类排序 → ID 排列，跳过没有分类的文章，只保留 id / name / slug', () => {
    const news = { id: 3, name: '学院动态', slug: 'news', order: 2 }
    const guide = { id: 1, name: '学习指南', slug: 'guide', order: 1 }
    const career = { id: 2, name: '行业观察', slug: 'industry', order: 1 }
    expect(collectArticleCategories([news, null, guide, news, career])).toEqual([
      { id: 1, name: '学习指南', slug: 'guide' },
      { id: 2, name: '行业观察', slug: 'industry' },
      { id: 3, name: '学院动态', slug: 'news' },
    ])
  })
})

describe('校区联系方式', () => {
  it('高德地图标注页：position=经度,纬度，名称做 URL 编码', () => {
    expect(amapMarkerUrl({ lng: 116.31, lat: 39.98 }, ' 北京 海淀校区 ')).toBe(
      'https://uri.amap.com/marker?position=116.31,39.98&name=%E5%8C%97%E4%BA%AC%20%E6%B5%B7%E6%B7%80%E6%A0%A1%E5%8C%BA',
    )
  })

  it('坐标保留 6 位小数', () => {
    expect(amapMarkerUrl({ lng: 121.123456789, lat: 31.1 }, 'A')).toBe(
      'https://uri.amap.com/marker?position=121.123457,31.1&name=A',
    )
  })

  it('坐标缺失、超出范围、不是有限数或为 (0, 0) 时不生成链接', () => {
    expect(amapMarkerUrl(undefined, 'A')).toBeNull()
    expect(amapMarkerUrl({ lng: 116.3, lat: null }, 'A')).toBeNull()
    expect(amapMarkerUrl({ lng: 181, lat: 30 }, 'A')).toBeNull()
    expect(amapMarkerUrl({ lng: 116.3, lat: -91 }, 'A')).toBeNull()
    expect(amapMarkerUrl({ lng: Number.NaN, lat: 30 }, 'A')).toBeNull()
    expect(amapMarkerUrl({ lng: 0, lat: 0 }, 'A')).toBeNull()
  })

  it('电话的 tel: 链接只保留数字与 +；没有数字时为 null', () => {
    expect(telHref('010-6000 0000')).toBe('tel:01060000000')
    expect(telHref('+86 400-000-0000')).toBe('tel:+864000000000')
    expect(telHref('  ')).toBeNull()
    expect(telHref(null)).toBeNull()
  })
})
