import { describe, expect, it } from 'vitest'

import { beijingDayStart, nextCohort, upcomingCohorts } from '@/lib/course/cohorts'
import { pickSalary } from '@/lib/course/salary'

import { cohortItem } from '../helpers/course-fixtures'

describe('upcomingCohorts', () => {
  // 北京时间 2026-11-23 08:30（UTC 00:30）
  const now = new Date('2026-11-23T00:30:00.000Z')

  it('北京时间当天 0 点 = 前一天 UTC 16:00', () => {
    expect(new Date(beijingDayStart(now)).toISOString()).toBe('2026-11-22T16:00:00.000Z')
    // UTC 当天 20:00 已是北京时间第二天
    expect(new Date(beijingDayStart(new Date('2026-11-23T20:00:00.000Z'))).toISOString()).toBe(
      '2026-11-23T16:00:00.000Z',
    )
  })

  it('开班日期 ≥ 北京时间今天 0 点的保留（今天开班仍显示），之前的去掉', () => {
    const cohorts = [
      cohortItem({ id: 1, startDate: '2026-11-22T15:59:59.999Z' }), // 北京 11-22 23:59：昨天
      cohortItem({ id: 2, startDate: '2026-11-22T16:00:00.000Z' }), // 北京 11-23 00:00：今天
      cohortItem({ id: 3, startDate: '2026-11-23T00:00:00.000Z' }), // 北京 11-23 08:00：今天，早于 now
    ]
    expect(upcomingCohorts(cohorts, now).map((c) => c.id)).toEqual([2, 3])
  })

  it('只保留报名中 / 即将开班 / 已满班，按开班日期升序，不修改原数组', () => {
    const cohorts = [
      cohortItem({ id: 1, startDate: '2027-02-01T02:00:00.000Z', status: 'upcoming' }),
      cohortItem({ id: 2, startDate: '2026-12-01T02:00:00.000Z', status: 'full' }),
      { ...cohortItem({ id: 3, startDate: '2026-12-05T02:00:00.000Z' }), status: 'closed' },
      cohortItem({ id: 4, startDate: '2026-12-20T02:00:00.000Z', status: 'enrolling' }),
    ]
    const snapshot = cohorts.map((c) => c.id)
    expect(upcomingCohorts(cohorts, now).map((c) => c.id)).toEqual([2, 4, 1])
    expect(cohorts.map((c) => c.id)).toEqual(snapshot)
  })

  it('nextCohort 取最近的一期，没有时为 null', () => {
    const cohorts = [
      cohortItem({ id: 1, startDate: '2027-01-10T02:00:00.000Z' }),
      cohortItem({ id: 2, startDate: '2026-12-10T02:00:00.000Z' }),
    ]
    expect(nextCohort(cohorts, now)?.id).toBe(2)
    expect(nextCohort(cohorts, new Date('2027-02-01T00:00:00.000Z'))).toBeNull()
    expect(nextCohort([], now)).toBeNull()
  })
})

describe('pickSalary', () => {
  const disclaimer = '以上薪资数据仅供参考，不作为培训效果承诺。'
  const discipline = {
    range: '8,000–15,000 元/月',
    source: '示例数据（虚构）',
    statDate: '2026 年 9 月',
    note: '一线城市初级岗位',
  }
  const course = {
    range: '10,000–18,000 元/月',
    source: '课程示例数据',
    statDate: '2026 年 10 月',
    note: null,
  }

  it('课程填写了区间就用课程的整组数据，并附上免责声明', () => {
    expect(pickSalary(course, discipline, disclaimer)).toEqual({
      range: '10,000–18,000 元/月',
      source: '课程示例数据',
      statDate: '2026 年 10 月',
      note: null,
      disclaimer,
    })
  })

  it('课程没有区间（空、空白、未填）时继承专业方向', () => {
    const expected = { ...discipline, disclaimer }
    expect(pickSalary({ range: '  ', source: 'x', statDate: 'y' }, discipline, disclaimer)).toEqual(
      expected,
    )
    expect(pickSalary({}, discipline, disclaimer)).toEqual(expected)
    expect(pickSalary(null, discipline, disclaimer)).toEqual(expected)
    expect(pickSalary(undefined, discipline, disclaimer)).toEqual(expected)
  })

  it('区间、来源、统计时间任一为空时返回 null（不展示薪资）', () => {
    expect(pickSalary(null, { ...discipline, source: '' }, disclaimer)).toBeNull()
    expect(pickSalary(null, { ...discipline, statDate: null }, disclaimer)).toBeNull()
    expect(pickSalary(null, { ...discipline, range: null }, disclaimer)).toBeNull()
    expect(pickSalary(null, null, disclaimer)).toBeNull()
    // 课程有区间但缺来源：不会拿专业方向的来源拼凑
    expect(pickSalary({ ...course, source: null }, discipline, disclaimer)).toBeNull()
  })

  it('免责声明为空时不展示薪资（合规要求必须注明不作为培训效果承诺）', () => {
    expect(pickSalary(course, discipline, '')).toBeNull()
    expect(pickSalary(course, discipline, null)).toBeNull()
  })

  it('去掉首尾空白，补充说明为空时为 null', () => {
    expect(
      pickSalary(
        { range: ' 1–2 万 ', source: ' 来源 ', statDate: ' 2026 ', note: ' ' },
        null,
        ' 声明 ',
      ),
    ).toEqual({ range: '1–2 万', source: '来源', statDate: '2026', note: null, disclaimer: '声明' })
  })
})
