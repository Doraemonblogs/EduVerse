import { absoluteUrl, type JsonLdData } from '@/lib/seo/json-ld'
import { teacherPath } from '@/lib/teachers/paths'
import type { TeacherDetail } from '@/lib/teachers/types'

/**
 * 讲师详情页的 Person 结构化数据（schema.org），配合 <JsonLd data={...} /> 输出。
 * 纯函数：站点地址、品牌名由调用方传入，便于测试。BreadcrumbList 由面包屑组件输出。
 */

export type TeacherJsonLdOptions = {
  /** 站点地址（getSiteUrl()，无末尾斜杠，子路径部署时含子路径） */
  siteUrl: string
  /** 品牌名（站点设置 brandName），作为 worksFor 机构名 */
  brandName: string
}

/**
 * 媒体地址转绝对地址。imageSource() 给出的地址已带 basePath（如 /EduVerse/api/media/…），
 * 用 URL 解析（以 / 开头的路径替换站点地址的路径部分），子路径部署时不会重复拼接子路径。
 */
function absoluteMediaUrl(src: string, siteUrl: string): string {
  return new URL(src, `${siteUrl}/`).href
}

/**
 * Person：姓名、头衔（jobTitle）、详情页地址、头像（绝对地址）、所属机构（worksFor），
 * 以及擅长的知识领域 knowsAbout（专业方向名称 + 擅长领域，去重；为空时不输出）。
 * 头像为空时不输出 image。
 */
export function teacherPersonJsonLd(
  teacher: Pick<
    TeacherDetail,
    'slug' | 'name' | 'title' | 'avatar' | 'disciplines' | 'specialties'
  >,
  { siteUrl, brandName }: TeacherJsonLdOptions,
): JsonLdData {
  const knowsAbout = [
    ...new Set(
      [...teacher.disciplines.map((d) => d.name), ...teacher.specialties]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]
  const data: JsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: teacher.name,
    url: absoluteUrl(teacherPath(teacher.slug), siteUrl),
    worksFor: { '@type': 'Organization', name: brandName, url: absoluteUrl('/', siteUrl) },
  }
  const jobTitle = teacher.title.trim()
  if (jobTitle) data.jobTitle = jobTitle
  if (teacher.avatar) data.image = absoluteMediaUrl(teacher.avatar.src, siteUrl)
  if (knowsAbout.length > 0) data.knowsAbout = knowsAbout
  return data
}
