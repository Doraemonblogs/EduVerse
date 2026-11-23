import { describe, expect, it } from 'vitest'

import {
  COURSE_DETAIL_SECTIONS,
  courseDetailNav,
  hasSectionContent,
  sectionTitleId,
} from '@/components/course/detail/sections'
import type { CourseDetail } from '@/lib/course/types'

import { courseDetail } from '../helpers/course-fixtures'

/** 课程详情页：哪些区块有内容（页内导航与区块渲染共用） */

const full = (): CourseDetail =>
  courseDetail({
    projects: [{ title: '毕业短片', description: null, image: null }],
    works: [{ id: 1, title: '作品', cover: null, authorName: null, cohortLabel: null }],
    teachers: [
      {
        id: 1,
        slug: 'lin',
        name: '林老师',
        title: '讲师',
        avatar: null,
        yearsOfExperience: null,
        specialties: [],
      },
    ],
    salary: {
      range: '7,000–13,000 元/月',
      source: '示例数据',
      statDate: '2026 年 9 月',
      note: null,
      disclaimer: '仅供参考',
    },
  })

describe('课程详情页内导航', () => {
  it('内容齐全时按页面顺序列出全部区块，文案来自 zh', () => {
    const nav = courseDetailNav(full())
    expect(nav.map((item) => item.id)).toEqual([...COURSE_DETAIL_SECTIONS])
    expect(nav.map((item) => item.label)).toEqual([
      '亮点与适合人群',
      '课程大纲',
      '实训项目',
      '学员作品',
      '授课讲师',
      '开班计划',
      '就业方向',
      '常见问题',
    ])
  })

  it('没有内容的区块不出现在导航里', () => {
    const nav = courseDetailNav(
      courseDetail({
        highlights: [],
        audience: [],
        projects: [],
        works: [],
        teachers: [],
        faqs: [],
      }),
    )
    expect(nav.map((item) => item.id)).toEqual(['syllabus', 'cohorts', 'careers'])
  })

  it('开班计划始终保留（没有近期开班时显示空状态）', () => {
    const empty = courseDetail({ cohorts: [] })
    expect(hasSectionContent(empty, 'cohorts')).toBe(true)
  })

  it('亮点或适合人群任一有内容即显示；大纲或软件任一有内容即显示', () => {
    expect(hasSectionContent(courseDetail({ highlights: [] }), 'overview')).toBe(true)
    expect(hasSectionContent(courseDetail({ audience: [] }), 'overview')).toBe(true)
    expect(hasSectionContent(courseDetail({ highlights: [], audience: [] }), 'overview')).toBe(
      false,
    )
    expect(hasSectionContent(courseDetail({ stages: [] }), 'syllabus')).toBe(true)
    expect(hasSectionContent(courseDetail({ stages: [], software: [] }), 'syllabus')).toBe(false)
  })

  it('就业方向：只有薪资参考也显示；方向与薪资都没有时不显示', () => {
    const salaryOnly = { ...full(), careerDirections: [] }
    expect(hasSectionContent(salaryOnly, 'careers')).toBe(true)
    expect(hasSectionContent(courseDetail({ careerDirections: [] }), 'careers')).toBe(false)
  })

  it('区块标题 id 由区块 id 派生，用于 aria-labelledby', () => {
    expect(sectionTitleId('faqs')).toBe('faqs-title')
  })
})
