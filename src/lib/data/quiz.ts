import 'server-only'

import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { cacheTags } from '@/hooks/revalidate'
import { toDisciplineRef } from '@/lib/course/mappers'
import type { CourseCardData } from '@/lib/course/types'
import { queryCourseCards } from '@/lib/data/courses'
import { imageSource } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { toQuizQuestion, toQuizSettings } from '@/lib/quiz/mappers'
import type { QuizData, QuizDiscipline, QuizQuestionData, QuizSettingsData } from '@/lib/quiz/types'

/**
 * 职业测试的数据查询：题目与参与计分的专业方向（含每个方向的课程）、职业测试设置。
 *
 * 两层导出（同 src/lib/data/courses.ts）：
 * - `query*(payload, …)`：查询函数，接收 Payload 实例，集成测试直接调用；
 * - `get*(…)`：页面使用的缓存版本（unstable_cache + 与 Payload 钩子一致的缓存标签）。
 *
 * 草稿：Local API 默认 overrideAccess=true——专业方向只取已发布的；
 * 题目没有草稿，但选项的加分里可能关联未发布 / 已删除的专业方向，这些分值直接丢弃（不参与计分与推荐）。
 * 课程卡片复用课程列表的查询（已发布、且专业方向已发布）。
 * 完整报告（各方向得分、推荐课程）是营销引导而非访问控制：数据本身公开，页面在留资后才展开显示。
 */

const published = { _status: { equals: 'published' } } as const satisfies Where

/** 每个专业方向在完整报告里展示的课程数 */
export const QUIZ_COURSES_LIMIT = 3

/** 专业方向用到的字段 */
const DISCIPLINE_SELECT = {
  name: true,
  shortName: true,
  slug: true,
  tagline: true,
  cover: true,
} as const

/** 课程卡片按专业方向分组，每组保留前 limit 门（课程列表的排序） */
function groupCourses(courses: readonly CourseCardData[], limit: number) {
  const groups = new Map<number, CourseCardData[]>()
  for (const course of courses) {
    const group = groups.get(course.discipline.id) ?? []
    if (group.length < limit) group.push(course)
    groups.set(course.discipline.id, group)
  }
  return groups
}

/**
 * 查询：职业测试 /quiz 的数据——题目（后台排序 order、ID，选项加分只含已发布方向）、
 * 已发布的专业方向（后台排序，同分时靠前的优先）及其课程卡片（最多 3 门）。
 * 没有题目或没有已发布方向时，页面应显示空状态（isQuizAvailable，src/lib/quiz/mappers.ts）。
 */
export async function queryQuizData(payload: Payload): Promise<QuizData> {
  const [disciplineResult, questionResult, courses] = await Promise.all([
    payload.find({
      collection: 'disciplines',
      where: published,
      select: DISCIPLINE_SELECT,
      depth: 1,
      sort: ['order', 'id'],
      pagination: false,
    }),
    payload.find({
      collection: 'quiz-questions',
      select: { question: true, options: true },
      // 加分规则里的专业方向只要 ID
      depth: 0,
      sort: ['order', 'id'],
      pagination: false,
    }),
    queryCourseCards(payload),
  ])

  const coursesByDiscipline = groupCourses(courses, QUIZ_COURSES_LIMIT)
  const disciplines: QuizDiscipline[] = disciplineResult.docs.map((doc) => ({
    ...toDisciplineRef(doc),
    tagline: doc.tagline?.trim() || null,
    cover: imageSource(doc.cover, 'card'),
    courses: coursesByDiscipline.get(doc.id) ?? [],
  }))
  const publishedIds = new Set(disciplines.map((d) => d.id))
  const questions = questionResult.docs
    .map((doc) => toQuizQuestion(doc, publishedIds))
    .filter((question): question is QuizQuestionData => question !== null)

  return { questions, disciplines }
}

/** 查询：职业测试设置（全局 quiz-settings），缺省值见 src/globals/quiz-settings-defaults.ts */
export async function queryQuizSettings(payload: Payload): Promise<QuizSettingsData> {
  const doc = await payload.findGlobal({ slug: 'quiz-settings', depth: 1 })
  return toQuizSettings(doc)
}

// ───────────────────────── 缓存版本（页面使用） ─────────────────────────

/** 题目、专业方向（名称 / 封面 / 发布状态 / 排序），以及课程卡片的全部依赖 */
const QUIZ_DATA_TAGS = [
  ...new Set(
    ['quiz-questions', 'disciplines', 'courses', 'campuses', 'cohorts', 'media'].map(
      cacheTags.collection,
    ),
  ),
]

/** 职业测试数据（缓存）：题目、专业方向及其课程卡片 */
export const getQuizData = unstable_cache(
  async (): Promise<QuizData> => queryQuizData(await getPayloadClient()),
  ['quiz-data'],
  { tags: QUIZ_DATA_TAGS },
)

/** 职业测试设置（缓存）：开始页、结果页文案与 SEO（generateMetadata 只需要它） */
export const getQuizSettings = unstable_cache(
  async (): Promise<QuizSettingsData> => queryQuizSettings(await getPayloadClient()),
  ['quiz-settings'],
  { tags: [cacheTags.global('quiz-settings'), cacheTags.collection('media')] },
)
