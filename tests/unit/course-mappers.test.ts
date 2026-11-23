import { describe, expect, it } from 'vitest'

import {
  publishedCampuses,
  relationId,
  sortCohorts,
  toCareerDirections,
  toCohortItem,
  toCourseCard,
  toCourseStages,
  toFaqItems,
  toSoftwareRefs,
  toTeacherCard,
  toWorkThumb,
  type CampusSource,
  type CohortSource,
  type CourseCardSource,
} from '@/lib/course/mappers'
import type { Media } from '@/payload-types'

/**
 * Payload 文档 → 视图模型：重点是按 depth 填充进来的草稿关联（从未发布过的草稿也会被填充）被剔除。
 */

const media = (name: string): Media => ({
  id: 1,
  alt: `${name}（占位图）`,
  url: `/api/media/file/${name}.jpg`,
  width: 1600,
  height: 900,
  sizes: {
    card: { url: `/api/media/file/${name}-800x450.webp`, width: 800, height: 450 },
    thumbnail: { url: `/api/media/file/${name}-400x225.webp`, width: 400, height: 225 },
  },
  updatedAt: '',
  createdAt: '',
})

const campus = (overrides: Partial<CampusSource> = {}): CampusSource => ({
  id: 1,
  name: '北京海淀校区',
  slug: 'beijing-haidian',
  city: '北京',
  citySlug: 'beijing',
  address: '示例地址',
  order: 0,
  _status: 'published',
  ...overrides,
})

const cohort = (overrides: Partial<CohortSource> = {}): CohortSource => ({
  id: 1,
  mode: 'offline',
  startDate: '2026-12-14T02:00:00.000Z',
  endDate: null,
  status: 'enrolling',
  note: null,
  campus: campus(),
  ...overrides,
})

const course = (overrides: Partial<CourseCardSource> = {}): CourseCardSource => ({
  id: 10,
  slug: 'c',
  title: '课程',
  summary: '简介',
  classType: 'long_term',
  deliveryModes: ['offline'],
  duration: { value: 6, unit: 'month' },
  schedule: '  ',
  stages: [
    { title: '阶段一', topics: [] },
    { title: '  ', topics: [] },
  ],
  featured: null,
  cover: media('course'),
  discipline: { id: 2, name: '三维动画', shortName: '', slug: '3d', _status: 'published' },
  campuses: [],
  ...overrides,
})

describe('relationId', () => {
  it('支持已填充文档、ID 与空值', () => {
    expect(relationId(5)).toBe(5)
    expect(relationId({ id: 6 })).toBe(6)
    expect(relationId(null)).toBeNull()
    expect(relationId(undefined)).toBeNull()
  })
})

describe('toCohortItem', () => {
  it('已结束的开班不展示', () => {
    expect(toCohortItem(cohort({ status: 'closed' }))).toBeNull()
  })

  it('校区未发布（草稿）的开班剔除', () => {
    expect(toCohortItem(cohort({ campus: campus({ _status: 'draft' }) }))).toBeNull()
    // 只有 ID、无法判断发布状态：同样剔除
    expect(toCohortItem(cohort({ campus: 3 }))).toBeNull()
  })

  it('线下 / 双师开班缺少校区（已删除）时剔除；线上开班没有校区正常展示', () => {
    expect(toCohortItem(cohort({ campus: null, mode: 'dual' }))).toBeNull()
    expect(toCohortItem(cohort({ campus: null, mode: 'online', note: ' 提供回放 ' }))).toEqual({
      id: 1,
      startDate: '2026-12-14T02:00:00.000Z',
      endDate: null,
      mode: 'online',
      status: 'enrolling',
      campus: null,
      note: '提供回放',
    })
  })

  it('已发布校区的开班带上校区名、slug（链接到校区详情）、城市与地址', () => {
    expect(toCohortItem(cohort())?.campus).toEqual({
      name: '北京海淀校区',
      slug: 'beijing-haidian',
      city: '北京',
      address: '示例地址',
    })
  })
})

describe('sortCohorts', () => {
  it('按开班日期升序，同一天按 ID', () => {
    const items = [
      { id: 3, startDate: '2026-12-20T00:00:00.000Z' },
      { id: 2, startDate: '2026-12-10T00:00:00.000Z' },
      { id: 1, startDate: '2026-12-20T00:00:00.000Z' },
    ].map((c) => ({ ...toCohortItem(cohort())!, ...c }))
    expect(sortCohorts(items).map((c) => c.id)).toEqual([2, 1, 3])
  })
})

describe('toCourseCard', () => {
  it('所属专业方向是草稿或未填充时返回 null', () => {
    expect(
      toCourseCard(course({ discipline: { id: 2, name: 'x', slug: 'x', _status: 'draft' } }), []),
    ).toBeNull()
    expect(toCourseCard(course({ discipline: 2 }), [])).toBeNull()
  })

  it('只保留已发布的校区并按校区排序；专业简称为空时用全称', () => {
    const card = toCourseCard(
      course({
        campuses: [
          campus({ id: 2, name: '上海徐汇校区', city: '上海', citySlug: 'shanghai', order: 5 }),
          campus({ id: 3, name: '草稿校区', _status: 'draft' }),
          4,
          campus({ id: 1, order: 1 }),
        ],
      }),
      [],
    )!
    expect(card.campuses.map((c) => c.id)).toEqual([1, 2])
    expect(card.discipline).toEqual({ id: 2, name: '三维动画', shortName: '三维动画', slug: '3d' })
  })

  it('封面取 card 尺寸；空白的上课时间与阶段名去掉', () => {
    const card = toCourseCard(course(), [])!
    expect(card.cover).toEqual({
      src: '/api/media/file/course-800x450.webp',
      alt: 'course（占位图）',
      width: 800,
      height: 450,
    })
    expect(card.schedule).toBeNull()
    expect(card.stageTitles).toEqual(['阶段一'])
    expect(card.featured).toBe(false)
  })

  it('publishedCampuses 处理空值', () => {
    expect(publishedCampuses(null)).toEqual([])
  })
})

describe('其它映射', () => {
  it('阶段：知识点去空，时长与目标为空时为 null', () => {
    expect(
      toCourseStages([
        { title: '阶段', duration: '', goals: null, topics: [{ text: ' 建模 ' }, { text: ' ' }] },
      ]),
    ).toEqual([{ title: '阶段', duration: null, goals: null, topics: ['建模'] }])
  })

  it('就业方向：去掉空标题', () => {
    expect(
      toCareerDirections([
        { title: '动画师', description: '' },
        { title: ' ', description: 'x' },
      ]),
    ).toEqual([{ title: '动画师', description: null }])
  })

  it('软件与 FAQ 只保留已填充的文档，保持顺序', () => {
    expect(
      toSoftwareRefs([
        { id: 1, name: 'Maya', category: 'modeling', slug: 'maya', updatedAt: '', createdAt: '' },
        2,
      ]),
    ).toEqual([{ id: 1, name: 'Maya', category: 'modeling' }])
    expect(
      toFaqItems([
        3,
        {
          id: 4,
          question: '问',
          answer: '答',
          category: 'course',
          updatedAt: '',
          createdAt: '',
        },
      ]),
    ).toEqual([{ id: 4, question: '问', answer: '答' }])
  })

  it('讲师头像取 thumbnail 尺寸；作品封面取 card 尺寸，署名与届别为空时为 null', () => {
    const teacher = toTeacherCard({
      id: 1,
      slug: 't',
      name: '林老师',
      title: '讲师',
      avatar: media('avatar'),
      yearsOfExperience: null,
      specialties: [{ text: '绑定' }],
    })
    expect(teacher.avatar?.src).toBe('/api/media/file/avatar-400x225.webp')
    expect(teacher.yearsOfExperience).toBeNull()
    expect(teacher.specialties).toEqual(['绑定'])

    const work = toWorkThumb({
      id: 9,
      title: '雨夜街角',
      author: { displayName: '小林', cohortLabel: '' },
      cover: media('work'),
    })
    expect(work).toMatchObject({ id: 9, authorName: '小林', cohortLabel: null })
    expect(work.cover?.src).toBe('/api/media/file/work-800x450.webp')
  })
})
