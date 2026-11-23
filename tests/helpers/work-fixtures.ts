import type { DisciplineRef } from '@/lib/course/types'
import type { TeacherListItem } from '@/lib/teachers/types'
import type { WorkCardData, WorkDetail, WorkFacets } from '@/lib/works/types'

import { disciplineRef } from './course-fixtures'

/**
 * 单元测试用的作品 / 讲师视图模型构造器（只填必要字段，其余用合理默认值）。
 */

export const ANIMATION = disciplineRef()
export const GAME: DisciplineRef = disciplineRef({
  id: 2,
  name: '游戏美术',
  shortName: '游戏',
  slug: 'game-art',
})
export const UI: DisciplineRef = disciplineRef({
  id: 4,
  name: 'UI/UX 设计',
  shortName: 'UI/UX',
  slug: 'ui-ux',
})

export const workCard = (overrides: Partial<WorkCardData> = {}): WorkCardData => ({
  id: 11,
  title: '《灯塔守望者》角色动画短片',
  cover: { src: '/api/media/file/work-800x450.webp', alt: '', width: 800, height: 450 },
  authorName: '林同学',
  cohortLabel: '2026 届',
  discipline: ANIMATION,
  software: ['maya'],
  featured: false,
  publishedAt: '2026-11-20T02:00:00.000Z',
  ...overrides,
})

export const workDetail = (overrides: Partial<WorkDetail> = {}): WorkDetail => {
  const { software: _software, ...card } = workCard()
  return {
    ...card,
    heroImage: { src: '/api/media/file/work-1920x1080.webp', alt: '', width: 1920, height: 1080 },
    shareImage: null,
    gallery: [],
    video: null,
    description: '毕业短片。',
    course: { id: 3, title: '三维动画设计长期就业班', slug: '3d-animation-career' },
    software: [{ slug: 'maya', name: 'Maya' }],
    related: [],
    seo: {},
    ...overrides,
  }
}

export const workFacets = (overrides: Partial<WorkFacets> = {}): WorkFacets => ({
  disciplines: [ANIMATION, GAME, UI],
  software: [
    { slug: 'maya', name: 'Maya' },
    { slug: 'zbrush', name: 'ZBrush' },
    { slug: 'blender', name: 'Blender' },
    { slug: 'figma', name: 'Figma' },
  ],
  ...overrides,
})

export const teacherListItem = (overrides: Partial<TeacherListItem> = {}): TeacherListItem => ({
  id: 1,
  slug: 'lin-yu-qing',
  name: '林雨晴',
  title: '三维动画讲师',
  avatar: { src: '/api/media/file/t-400x400.webp', alt: '', width: 400, height: 400 },
  yearsOfExperience: 12,
  specialties: ['角色表演动画'],
  disciplines: [ANIMATION],
  ...overrides,
})
