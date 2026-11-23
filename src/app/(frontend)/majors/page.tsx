import { permanentRedirect } from 'next/navigation'

import { COURSES_PATH } from '@/lib/course/paths'

/**
 * /majors 没有独立页面（专业方向都在课程列表里按方向分组展示）：
 * 永久重定向到课程列表，避免手动删掉 URL 末段的访客落到 404。
 */
export default function MajorsIndexPage(): never {
  permanentRedirect(COURSES_PATH)
}
