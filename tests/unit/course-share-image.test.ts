import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DisciplineDetail } from '@/lib/course/types'

import { courseDetail, disciplineRef } from '../helpers/course-fixtures'

/**
 * 课程详情 / 专业方向页的分享图（og:image）：用视图模型里的 og 裁切（1200×630），
 * 不用首屏大图（hero 尺寸，竖版封面时比例完全不对）。数据层取图见 tests/unit/course-data.test.ts。
 */
const data = vi.hoisted(() => ({
  getCourseDetail: vi.fn(),
  getDisciplineDetail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/data/site', () => ({ getSiteSettings: () => Promise.resolve({}) }))
vi.mock('@/lib/data/lead-form', () => ({ getLeadFormConfig: vi.fn() }))
vi.mock('@/lib/data/courses', () => ({
  ...data,
  getCoursePagesSettings: vi.fn(),
  getPublishedCourseSlugs: vi.fn(),
  getPublishedDisciplineSlugs: vi.fn(),
}))
vi.mock('@/components/course/detail/course-detail-view', () => ({ CourseDetailView: () => null }))
vi.mock('@/components/course/major/major-view', () => ({ MajorView: () => null }))
vi.mock('@/components/lead/page-lead-context', () => ({ PageLeadContext: () => null }))
vi.mock('@/lib/seo/default-share-image.png', () => ({
  default: { src: '/_next/static/media/default-share-image.0abc.png', width: 1200, height: 630 },
}))

const heroImage = {
  src: '/api/media/file/cover-1920x2560.webp',
  alt: '封面',
  width: 1920,
  height: 2560,
}
const shareImage = {
  src: '/api/media/file/cover-1200x630.webp',
  alt: '封面',
  width: 1200,
  height: 630,
}
const expectedOgImage = {
  url: 'https://www.example.cn/api/media/file/cover-1200x630.webp',
  width: 1200,
  height: 630,
  alt: '封面',
}

const discipline: DisciplineDetail = {
  ...disciplineRef(),
  tagline: '在虚拟空间里搭建角色与场景',
  heroImage,
  shareImage,
  intro: null,
  careerDirections: [],
  salary: null,
  courses: [],
  works: [],
  teachers: [],
  seo: {},
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_BASE_PATH', '')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.example.cn')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('课程与专业方向页的分享图', () => {
  it('课程详情的 og:image 是封面的 og 裁切，不是首屏大图', async () => {
    data.getCourseDetail.mockResolvedValue(courseDetail({ heroImage, shareImage }))
    const { generateMetadata } = await import('@/app/(frontend)/courses/[slug]/page')
    const metadata = await generateMetadata(params('3d-animation-career'))
    expect(metadata.openGraph?.images).toEqual([expectedOgImage])
  })

  it('专业方向页的 og:image 是封面的 og 裁切，不是首屏大图', async () => {
    data.getDisciplineDetail.mockResolvedValue(discipline)
    const { generateMetadata } = await import('@/app/(frontend)/majors/[slug]/page')
    const metadata = await generateMetadata(params('3d-animation'))
    expect(metadata.openGraph?.images).toEqual([expectedOgImage])
  })

  it('封面缺失、站点也没有默认分享图时用内置兜底图', async () => {
    data.getDisciplineDetail.mockResolvedValue({ ...discipline, heroImage: null, shareImage: null })
    const { generateMetadata } = await import('@/app/(frontend)/majors/[slug]/page')
    const metadata = await generateMetadata(params('3d-animation'))
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://www.example.cn/_next/static/media/default-share-image.0abc.png',
        width: 1200,
        height: 630,
        alt: 'EduVerse 数艺学院',
      },
    ])
  })

  it('课程不存在时在元数据阶段就 404（浏览器端标题不会回退成站点默认标题）', async () => {
    data.getCourseDetail.mockResolvedValue(null)
    const { generateMetadata } = await import('@/app/(frontend)/courses/[slug]/page')
    await expect(generateMetadata(params('missing'))).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404/,
    )
  })
})
