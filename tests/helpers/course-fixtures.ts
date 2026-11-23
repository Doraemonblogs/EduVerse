import type {
  CampusRef,
  CohortItem,
  CourseCardData,
  CourseDetail,
  DisciplineRef,
} from '@/lib/course/types'

/**
 * 单元测试用的课程视图模型构造器（只填必要字段，其余用合理默认值）。
 * 默认课程与默认专业方向的 ID 故意不同（课程 3、专业 7），断言留资上下文时能发现两者被传反。
 */

export const DEFAULT_DISCIPLINE_ID = 7
export const DEFAULT_COURSE_ID = 3

export const disciplineRef = (overrides: Partial<DisciplineRef> = {}): DisciplineRef => ({
  id: DEFAULT_DISCIPLINE_ID,
  name: '三维动画',
  shortName: '三维动画',
  slug: '3d-animation',
  ...overrides,
})

export const campusRef = (overrides: Partial<CampusRef> = {}): CampusRef => ({
  id: 1,
  name: '北京海淀校区',
  slug: 'beijing-haidian',
  city: '北京',
  citySlug: 'beijing',
  address: '北京市海淀区示例路 1 号',
  order: 0,
  ...overrides,
})

export const BEIJING = campusRef()
export const SHANGHAI = campusRef({
  id: 2,
  name: '上海徐汇校区',
  slug: 'shanghai-xuhui',
  city: '上海',
  citySlug: 'shanghai',
  address: '上海市徐汇区示例路 2 号',
  order: 1,
})
export const SHENZHEN = campusRef({
  id: 3,
  name: '深圳南山校区',
  slug: 'shenzhen-nanshan',
  city: '深圳',
  citySlug: 'shenzhen',
  address: '深圳市南山区示例路 3 号',
  order: 2,
})

export const cohortItem = (overrides: Partial<CohortItem> = {}): CohortItem => ({
  id: 1,
  startDate: '2026-12-14T02:00:00.000Z',
  endDate: '2027-06-30T02:00:00.000Z',
  mode: 'offline',
  status: 'enrolling',
  campus: { name: BEIJING.name, city: BEIJING.city, address: BEIJING.address },
  note: null,
  ...overrides,
})

export const courseCard = (overrides: Partial<CourseCardData> = {}): CourseCardData => ({
  id: DEFAULT_COURSE_ID,
  slug: '3d-animation-career',
  title: '三维动画设计长期就业班',
  summary: '用七个月完整走一遍三维动画生产流程。',
  cover: { src: '/api/media/file/cover-800x450.webp', alt: '课程封面', width: 800, height: 450 },
  discipline: disciplineRef(),
  classType: 'long_term',
  deliveryModes: ['offline', 'dual'],
  duration: { value: 7, unit: 'month' },
  schedule: '全日制（周一至周五）',
  campuses: [BEIJING, SHANGHAI],
  stageTitles: ['造型基础', '模型与贴图', '角色绑定'],
  cohorts: [cohortItem()],
  featured: false,
  ...overrides,
})

export const courseDetail = (overrides: Partial<CourseDetail> = {}): CourseDetail => ({
  ...courseCard(),
  heroImage: {
    src: '/api/media/file/cover-1600x900.webp',
    alt: '课程封面',
    width: 1600,
    height: 900,
  },
  shareImage: null,
  highlights: ['按项目流程分阶段推进'],
  audience: ['对动画有兴趣的高中及以上学历学员'],
  stages: [{ title: '造型基础', duration: '4 周', goals: '熟悉软件', topics: ['界面', '建模'] }],
  software: [{ id: 1, name: 'Maya', category: 'modeling' }],
  projects: [],
  teachers: [],
  works: [],
  careerDirections: [{ title: '三维动画师', description: null }],
  salary: null,
  faqs: [{ id: 1, question: '零基础可以学吗？', answer: '可以，从基础讲起。' }],
  related: [],
  seo: {},
  ...overrides,
})
