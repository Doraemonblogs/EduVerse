import { describe, expect, it } from 'vitest'

import { teacherPersonJsonLd } from '@/components/teachers/teacher-json-ld'
import {
  assignTeacherSectionTones,
  isRichTextFilled,
  teacherMetaDescription,
  teacherMetaTitle,
  teacherSectionKeys,
} from '@/components/teachers/teacher-layout'
import { isRichTextFilled as sharedIsRichTextFilled } from '@/lib/rich-text-filled'
import type { TeacherDetail } from '@/lib/teachers/types'

import { courseCard } from '../helpers/course-fixtures'
import { ANIMATION, GAME, workCard } from '../helpers/work-fixtures'

/**
 * 讲师详情页的纯函数：区块取舍与底色、页面标题 / 描述兜底、Person 结构化数据。
 */

type Bio = NonNullable<TeacherDetail['bio']>

function bioOf(...paragraphs: string[]): Bio {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text, version: 1, format: 0 }],
      })),
    },
  }
}

const EMPTY_BIO: Bio = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [{ type: 'paragraph', version: 1, children: [] }],
  },
}

function teacher(overrides: Partial<TeacherDetail> = {}): TeacherDetail {
  return {
    id: 1,
    slug: 'lin-yuqing',
    name: '林雨晴',
    title: '三维动画教研负责人',
    avatar: { src: '/api/media/file/t-600x600.webp', alt: '', width: 600, height: 600 },
    shareImage: null,
    yearsOfExperience: 12,
    campus: { name: '北京海淀校区', slug: 'beijing-haidian', city: '北京' },
    disciplines: [ANIMATION],
    specialties: ['角色表演动画'],
    bio: bioOf('林雨晴从事三维动画工作十余年。', '她的课堂以观察为起点。'),
    experience: [{ period: '2014–2018', org: '长风动画工作室', role: '角色动画师' }],
    courses: [courseCard()],
    works: [workCard()],
    seo: {},
    ...overrides,
  }
}

describe('isRichTextFilled', () => {
  it('有段落文字时为 true；null、空编辑器（只有一个空段落）为 false', () => {
    expect(isRichTextFilled(bioOf('简介'))).toBe(true)
    expect(isRichTextFilled(EMPTY_BIO)).toBe(false)
    expect(isRichTextFilled(null)).toBe(false)
    expect(isRichTextFilled(undefined)).toBe(false)
  })

  it('与专业介绍、学员故事正文共用同一个判断（src/lib/rich-text-filled.ts）', () => {
    expect(isRichTextFilled).toBe(sharedIsRichTextFilled)
  })
})

describe('teacherSectionKeys', () => {
  it('按页面顺序列出有内容的区块：简介 / 经历 → 授课课程 → 学员作品', () => {
    expect(teacherSectionKeys(teacher())).toEqual(['profile', 'courses', 'works'])
  })

  it('简介为空但有从业经历时仍渲染 profile；两者都没有时不渲染', () => {
    expect(teacherSectionKeys(teacher({ bio: EMPTY_BIO }))).toContain('profile')
    expect(teacherSectionKeys(teacher({ bio: null, experience: [] }))).not.toContain('profile')
  })

  it('没有授课课程 / 作品时对应区块不渲染', () => {
    expect(teacherSectionKeys(teacher({ courses: [], works: [] }))).toEqual(['profile'])
  })
})

describe('assignTeacherSectionTones', () => {
  it('首屏深色之后从白底开始，浅色区块白底 / 米色交替，学员作品固定深色', () => {
    const tones = assignTeacherSectionTones(['profile', 'courses', 'works'])
    expect(Object.fromEntries(tones)).toEqual({ profile: 'light', courses: 'paper', works: 'dark' })
  })

  it('缺少简介区块时授课课程从白底开始', () => {
    const tones = assignTeacherSectionTones(['courses', 'works'])
    expect(tones.get('courses')).toBe('light')
    expect(tones.get('works')).toBe('dark')
  })
})

describe('teacherMetaTitle / teacherMetaDescription', () => {
  it('标题：姓名 · 头衔；头衔为空时只用姓名', () => {
    expect(teacherMetaTitle(teacher())).toBe('林雨晴 · 三维动画教研负责人')
    expect(teacherMetaTitle(teacher({ title: ' ' }))).toBe('林雨晴')
  })

  it('描述：取个人简介第一段（纯文本），超过 120 字截断', () => {
    expect(teacherMetaDescription(teacher())).toBe('林雨晴从事三维动画工作十余年。')
    const long = '一'.repeat(200)
    expect(teacherMetaDescription(teacher({ bio: bioOf(long) }))).toHaveLength(120)
  })

  it('简介为空时用“姓名，头衔。”；头衔也为空时只用姓名', () => {
    expect(teacherMetaDescription(teacher({ bio: null }))).toBe('林雨晴，三维动画教研负责人。')
    expect(teacherMetaDescription(teacher({ bio: EMPTY_BIO, title: '' }))).toBe('林雨晴')
  })
})

describe('teacherPersonJsonLd', () => {
  const options = { siteUrl: 'https://example.com', brandName: '数艺学院' }

  it('Person：姓名、头衔、详情页地址、头像绝对地址、所属机构与擅长领域（去重）', () => {
    const data = teacherPersonJsonLd(
      teacher({
        disciplines: [ANIMATION, GAME],
        specialties: ['角色表演动画', '三维动画', ' '],
      }),
      options,
    )
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: '林雨晴',
      jobTitle: '三维动画教研负责人',
      url: 'https://example.com/teachers/lin-yuqing',
      image: 'https://example.com/api/media/file/t-600x600.webp',
      worksFor: { '@type': 'Organization', name: '数艺学院', url: 'https://example.com' },
      knowsAbout: ['三维动画', '游戏美术', '角色表演动画'],
    })
  })

  it('子路径部署：头像地址已带子路径，不重复拼接', () => {
    const data = teacherPersonJsonLd(
      teacher({
        avatar: { src: '/EduVerse/api/media/file/t.webp', alt: '', width: 600, height: 600 },
      }),
      { siteUrl: 'https://example.github.io/EduVerse', brandName: '数艺学院' },
    )
    expect(data.image).toBe('https://example.github.io/EduVerse/api/media/file/t.webp')
    expect(data.url).toBe('https://example.github.io/EduVerse/teachers/lin-yuqing')
  })

  it('没有头像、头衔与擅长领域时不输出 image / jobTitle / knowsAbout', () => {
    const data = teacherPersonJsonLd(
      teacher({ avatar: null, title: '', disciplines: [], specialties: [] }),
      options,
    )
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('jobTitle')
    expect(data).not.toHaveProperty('knowsAbout')
  })
})
