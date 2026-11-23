import type { SectionTone } from '@/components/common/section'
import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import { lexicalToPlainText, truncateText } from '@/lib/lexical-text'
import { isRichTextFilled } from '@/lib/rich-text-filled'
import type { TeacherDetail } from '@/lib/teachers/types'

/**
 * 讲师详情页的纯函数：区块取舍与底色、页面标题 / 描述的兜底。
 */

const t = zh.teachers.detail

/** 首屏之后可能出现的内容区块（按页面顺序）；没有内容的区块不渲染 */
export type TeacherSectionKey = 'profile' | 'courses' | 'works'

/** 讲师详情页展示的作品上限（数据层已限制，这里再兜一次） */
export const TEACHER_WORKS_LIMIT = 8

/** 页面描述兜底的最大字数（搜索结果摘要一般显示 80–120 个汉字） */
const META_DESCRIPTION_MAX = 120

/**
 * 富文本是否有内容（空编辑器只有一个空段落，也视为没有）：实现在 src/lib/rich-text-filled.ts，
 * 这里转出供讲师详情页使用
 */
export { isRichTextFilled }

/** 实际渲染的内容区块（个人简介与从业经历合为一个区块 profile，任一有内容即渲染） */
export function teacherSectionKeys(teacher: TeacherDetail): TeacherSectionKey[] {
  const keys: TeacherSectionKey[] = []
  if (isRichTextFilled(teacher.bio) || teacher.experience.length > 0) keys.push('profile')
  if (teacher.courses.length > 0) keys.push('courses')
  if (teacher.works.length > 0) keys.push('works')
  return keys
}

/**
 * 给实际渲染的区块分配底色：学员作品固定深色（衬托作品），其余在白底 / 米色之间交替，
 * 保证相邻两个浅色区块底色不同（中间缺了某个区块也一样），首屏（深色）之后从白底开始。
 */
export function assignTeacherSectionTones(
  keys: readonly TeacherSectionKey[],
): Map<TeacherSectionKey, SectionTone> {
  const tones = new Map<TeacherSectionKey, SectionTone>()
  let previous: SectionTone = 'dark'
  for (const key of keys) {
    const tone: SectionTone = key === 'works' ? 'dark' : previous === 'light' ? 'paper' : 'light'
    tones.set(key, tone)
    previous = tone
  }
  return tones
}

/** SEO 标题未填写时的页面标题：“姓名 · 头衔”（头衔为空时只用姓名） */
export function teacherMetaTitle(teacher: Pick<TeacherDetail, 'name' | 'title'>): string {
  const title = teacher.title.trim()
  return title ? formatMessage(t.metaTitle, { name: teacher.name, title }) : teacher.name
}

/**
 * SEO 描述未填写时的页面描述：个人简介的第一段（纯文本，超长截断）；
 * 简介为空时用“姓名，头衔。”
 */
export function teacherMetaDescription(
  teacher: Pick<TeacherDetail, 'name' | 'title' | 'bio'>,
): string {
  const firstParagraph = lexicalToPlainText(teacher.bio).split('\n')[0] ?? ''
  if (firstParagraph) return truncateText(firstParagraph, META_DESCRIPTION_MAX)
  const title = teacher.title.trim()
  return title ? formatMessage(t.metaDescription, { name: teacher.name, title }) : teacher.name
}
