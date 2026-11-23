import { describe, expect, it } from 'vitest'

import { COHORT_STATUS_OPTIONS } from '@/collections/Cohorts'
import { CLASS_TYPE_OPTIONS, DELIVERY_MODE_OPTIONS } from '@/collections/Courses'
import { zh } from '@/i18n/zh'
import {
  campusLabel,
  classTypeLabel,
  cohortPlaceLabel,
  cohortStatusLabel,
  courseCities,
  courseCitiesLabel,
  deliveryModeLabel,
  deliveryModesLabel,
  formatCohortDate,
  formatDuration,
  formatMessage,
  isOnlineOnly,
  joinList,
  LIST_SEPARATOR,
  noCampusLabel,
  toBeijingIsoDate,
} from '@/lib/course/format'
import { coursePath, COURSES_PATH, majorPath } from '@/lib/course/paths'
import type { ClassType, CohortStatus, DeliveryMode } from '@/lib/course/types'

import { BEIJING, cohortItem, SHANGHAI } from '../helpers/course-fixtures'

describe('标签与后台选项一致', () => {
  it('班型', () => {
    for (const option of CLASS_TYPE_OPTIONS) {
      expect(classTypeLabel(option.value as ClassType)).toBe(option.label)
    }
    expect(Object.keys(zh.course.classType)).toEqual(CLASS_TYPE_OPTIONS.map((o) => o.value))
  })

  it('授课方式', () => {
    for (const option of DELIVERY_MODE_OPTIONS) {
      expect(deliveryModeLabel(option.value as DeliveryMode)).toBe(option.label)
    }
    expect(Object.keys(zh.course.deliveryMode)).toEqual(DELIVERY_MODE_OPTIONS.map((o) => o.value))
  })

  it('开班状态（“已结束”不在前台出现）', () => {
    const visible = COHORT_STATUS_OPTIONS.filter((o) => o.value !== 'closed')
    for (const option of visible) {
      expect(cohortStatusLabel(option.value as CohortStatus)).toBe(option.label)
    }
    expect(Object.keys(zh.course.cohortStatus)).toEqual(visible.map((o) => o.value))
  })
})

describe('formatMessage', () => {
  it('替换占位，缺少的占位保持原样', () => {
    expect(formatMessage('共 {count} 门课程', { count: 3 })).toBe('共 3 门课程')
    expect(formatMessage('{a} 与 {b}', { a: '甲' })).toBe('甲 与 {b}')
  })

  it('值中的 $ 等字符按原样输出', () => {
    expect(formatMessage('预约试听：{title}', { title: '$& 班' })).toBe('预约试听：$& 班')
  })
})

describe('formatDuration', () => {
  it('输出“数值 + 单位”', () => {
    expect(formatDuration({ value: 7, unit: 'month' })).toBe('7 个月')
    expect(formatDuration({ value: 8, unit: 'week' })).toBe('8 周')
  })

  it('没有时长或数值无效时为空字符串', () => {
    expect(formatDuration(null)).toBe('')
    expect(formatDuration({ value: 0, unit: 'week' })).toBe('')
  })
})

describe('formatCohortDate / toBeijingIsoDate', () => {
  it('按北京时间取日期：UTC 16:00 之后已是北京的第二天', () => {
    expect(formatCohortDate('2026-12-13T16:00:00.000Z')).toBe('2026年12月14日')
    expect(formatCohortDate('2026-12-13T15:59:59.999Z')).toBe('2026年12月13日')
    expect(toBeijingIsoDate('2026-12-13T16:00:00.000Z')).toBe('2026-12-14')
    expect(toBeijingIsoDate(new Date('2027-01-05T03:00:00.000Z'))).toBe('2027-01-05')
  })

  it('空值与无效日期返回空字符串', () => {
    expect(formatCohortDate(null)).toBe('')
    expect(formatCohortDate('not-a-date')).toBe('')
    expect(toBeijingIsoDate(undefined)).toBe('')
  })
})

/** 不换行空格（列表分隔符“/”前的空格） */
const NBSP = '\u00a0'

describe('授课方式、城市与校区的展示文字', () => {
  it('列表分隔符“/”前是不换行空格：换行时“/”不会出现在行首', () => {
    expect(LIST_SEPARATOR).toBe(`${NBSP}/ `)
    expect(joinList(['北京', '上海', '广州'])).toBe(`北京${NBSP}/ 上海${NBSP}/ 广州`)
    expect(joinList(['北京'])).toBe('北京')
    expect(joinList([])).toBe('')
  })

  it('多个授课方式按后台选项顺序拼接并去重', () => {
    expect(deliveryModesLabel(['dual', 'offline', 'dual'])).toBe(`线下面授${NBSP}/ 双师课堂`)
    expect(deliveryModesLabel([])).toBe('')
  })

  it('开设城市按校区顺序去重', () => {
    const second = { ...BEIJING, id: 9, name: '北京朝阳校区' }
    expect(courseCities([BEIJING, second, SHANGHAI])).toEqual(['北京', '上海'])
    expect(courseCitiesLabel([BEIJING, SHANGHAI], ['offline'])).toBe(`北京${NBSP}/ 上海`)
  })

  it('没有校区时：纯线上课程显示“线上”，线下 / 双师课程显示“待定”而不是“线上”', () => {
    expect(isOnlineOnly(['online'])).toBe(true)
    expect(isOnlineOnly(['online', 'dual'])).toBe(false)
    expect(isOnlineOnly([])).toBe(false)

    expect(courseCitiesLabel([], ['online'])).toBe('线上')
    expect(courseCitiesLabel([], ['offline'])).toBe('待定')
    expect(courseCitiesLabel([], ['dual'])).toBe('待定')
    expect(courseCitiesLabel([], ['offline', 'online'])).toBe('待定')
    expect(noCampusLabel(['online'])).toBe(zh.course.online)
    expect(noCampusLabel(['offline'])).toBe(zh.course.campusPending)
  })

  it('校区名已以城市开头时不再重复城市，否则显示“城市·校区名”', () => {
    expect(campusLabel(BEIJING)).toBe('北京海淀校区')
    expect(campusLabel({ city: '北京', name: '中关村校区' })).toBe('北京·中关村校区')
    expect(campusLabel({ city: ' 上海 ', name: ' 上海徐汇校区 ' })).toBe('上海徐汇校区')
    expect(campusLabel({ city: '', name: '总部校区' })).toBe('总部校区')
    expect(campusLabel({ city: '成都', name: '' })).toBe('成都')
  })

  it('开班地点：有校区时为校区展示名，没有校区的线上开班显示“线上”', () => {
    expect(cohortPlaceLabel(cohortItem())).toBe('北京海淀校区')
    expect(
      cohortPlaceLabel(cohortItem({ campus: { name: '中关村校区', city: '北京', address: '' } })),
    ).toBe('北京·中关村校区')
    expect(cohortPlaceLabel(cohortItem({ campus: null, mode: 'online' }))).toBe('线上')
  })
})

describe('课程模块路径', () => {
  it('与富文本站内链接的前缀一致', () => {
    expect(COURSES_PATH).toBe('/courses')
    expect(coursePath('ui-ux-career')).toBe('/courses/ui-ux-career')
    expect(majorPath('ui-ux')).toBe('/majors/ui-ux')
  })
})
