import { describe, expect, it } from 'vitest'

import { courseItemListJsonLd, courseJsonLd, faqPageJsonLd } from '@/lib/course/json-ld'
import { serializeJsonLd } from '@/lib/seo/json-ld'

import { cohortItem, courseDetail } from '../helpers/course-fixtures'

const now = new Date('2026-11-23T00:30:00.000Z')
const options = { siteUrl: 'https://www.example.cn', brandName: 'EduVerse 数艺学院', now }

describe('courseJsonLd', () => {
  const detail = courseDetail({
    cohorts: [
      cohortItem({ id: 1, startDate: '2026-11-01T02:00:00.000Z' }), // 已开班：不输出
      cohortItem({
        id: 2,
        mode: 'offline',
        startDate: '2026-12-13T16:30:00.000Z',
        endDate: '2027-06-30T02:00:00.000Z',
      }),
      cohortItem({ id: 3, mode: 'online', campus: null, startDate: '2026-12-20T02:00:00.000Z' }),
      cohortItem({ id: 4, mode: 'dual', startDate: '2027-01-08T02:00:00.000Z', endDate: null }),
    ],
  })

  it('输出 Course 基本信息，地址与图片为绝对地址，没有价格时不输出 offers', () => {
    const data = courseJsonLd(detail, options)
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: detail.title,
      description: detail.summary,
      url: 'https://www.example.cn/courses/3d-animation-career',
      image: 'https://www.example.cn/api/media/file/cover-1600x900.webp',
      inLanguage: 'zh-CN',
      timeRequired: 'P7M',
      provider: {
        '@type': 'Organization',
        name: 'EduVerse 数艺学院',
        url: 'https://www.example.cn',
      },
    })
    expect(data).not.toHaveProperty('offers')
  })

  it('子路径部署：页面地址带子路径，已带 basePath 的图片地址不会重复拼接', () => {
    const data = courseJsonLd(
      courseDetail({
        heroImage: { src: '/EduVerse/api/media/file/hero.webp', alt: '', width: 1, height: 1 },
      }),
      { ...options, siteUrl: 'https://user.github.io/EduVerse' },
    )
    expect(data.url).toBe('https://user.github.io/EduVerse/courses/3d-animation-career')
    expect(data.image).toBe('https://user.github.io/EduVerse/api/media/file/hero.webp')
  })

  it('每个未开班的开班计划生成 CourseInstance：授课方式映射、北京时间日期、校区地点', () => {
    const instances = courseJsonLd(detail, options).hasCourseInstance
    expect(instances).toEqual([
      {
        '@type': 'CourseInstance',
        courseMode: 'Onsite',
        startDate: '2026-12-14',
        endDate: '2027-06-30',
        location: {
          '@type': 'Place',
          name: '北京海淀校区',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '北京市海淀区示例路 1 号',
            addressLocality: '北京',
            addressCountry: 'CN',
          },
        },
      },
      {
        '@type': 'CourseInstance',
        courseMode: 'Online',
        startDate: '2026-12-20',
        endDate: '2027-06-30',
      },
      expect.objectContaining({ courseMode: 'Blended', startDate: '2027-01-08' }),
    ])
    expect((instances as Record<string, unknown>[])[2]).not.toHaveProperty('endDate')
  })

  it('没有未开班的开班计划时不输出 hasCourseInstance；周制课程时长为 PnW', () => {
    const data = courseJsonLd(
      courseDetail({
        cohorts: [],
        duration: { value: 8, unit: 'week' },
        heroImage: null,
        cover: null,
      }),
      options,
    )
    expect(data).not.toHaveProperty('hasCourseInstance')
    expect(data).not.toHaveProperty('image')
    expect(data.timeRequired).toBe('P8W')
  })

  it('序列化后是合法 JSON', () => {
    expect(JSON.parse(serializeJsonLd(courseJsonLd(detail, options)))).toBeTruthy()
  })
})

describe('faqPageJsonLd', () => {
  it('每个问题对应 Question + acceptedAnswer', () => {
    expect(
      faqPageJsonLd([
        { id: 1, question: '零基础可以学吗？', answer: '可以。' },
        { id: 2, question: '可以分期吗？', answer: '请咨询课程顾问。' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '零基础可以学吗？',
          acceptedAnswer: { '@type': 'Answer', text: '可以。' },
        },
        {
          '@type': 'Question',
          name: '可以分期吗？',
          acceptedAnswer: { '@type': 'Answer', text: '请咨询课程顾问。' },
        },
      ],
    })
  })

  it('没有问题时返回 null', () => {
    expect(faqPageJsonLd([])).toBeNull()
  })
})

describe('courseItemListJsonLd', () => {
  it('按顺序列出课程详情页的绝对地址；没有课程时返回 null', () => {
    expect(
      courseItemListJsonLd(
        [
          { slug: 'a', title: '课程 A' },
          { slug: 'b', title: '课程 B' },
        ],
        'https://www.example.cn',
      ),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://www.example.cn/courses/a',
          name: '课程 A',
        },
        {
          '@type': 'ListItem',
          position: 2,
          url: 'https://www.example.cn/courses/b',
          name: '课程 B',
        },
      ],
    })
    expect(courseItemListJsonLd([], 'https://www.example.cn')).toBeNull()
  })
})
