import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { zh } from '@payloadcms/translations/languages/zh'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { ArticleCategories } from './collections/ArticleCategories'
import { AuditLogs } from './collections/AuditLogs'
import { Articles } from './collections/Articles'
import { Banners } from './collections/Banners'
import { Campuses } from './collections/Campuses'
import { CareerEvents } from './collections/CareerEvents'
import { Cohorts } from './collections/Cohorts'
import { Courses } from './collections/Courses'
import { Disciplines } from './collections/Disciplines'
import { Faqs } from './collections/Faqs'
import { Leads } from './collections/Leads'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Partners } from './collections/Partners'
import { QuizQuestions } from './collections/QuizQuestions'
import { Software } from './collections/Software'
import { Stories } from './collections/Stories'
import { Teachers } from './collections/Teachers'
import { Tutorials } from './collections/Tutorials'
import { Users } from './collections/Users'
import { Works } from './collections/Works'
import { ArticlePages } from './globals/ArticlePages'
import { CampusPages } from './globals/CampusPages'
import { CareersPage } from './globals/CareersPage'
import { CoursePages } from './globals/CoursePages'
import { Footer } from './globals/Footer'
import { HomePage } from './globals/HomePage'
import { LeadSettings } from './globals/LeadSettings'
import { Navigation } from './globals/Navigation'
import { QuizSettings } from './globals/QuizSettings'
import { SiteSettings } from './globals/SiteSettings'
import { TeacherPages } from './globals/TeacherPages'
import { WorkPages } from './globals/WorkPages'
import { jobsConfig } from './jobs/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    // 使用内置头像图标，避免向 gravatar.com（境外、且会泄露邮箱哈希）发请求
    avatar: 'default',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · EduVerse 后台',
    },
  },
  i18n: {
    // 后台界面使用简体中文
    supportedLanguages: { zh },
    fallbackLanguage: 'zh',
  },
  // 侧边栏顺序：课程体系 → 师资与作品 → 内容运营 → 线索 → 站点配置 → 系统
  collections: [
    Disciplines,
    Courses,
    Cohorts,
    Software,
    Teachers,
    Works,
    Stories,
    Partners,
    CareerEvents,
    Articles,
    ArticleCategories,
    Campuses,
    Banners,
    Faqs,
    Tutorials,
    QuizQuestions,
    Pages,
    Leads,
    Users,
    Media,
    AuditLogs,
  ],
  globals: [
    SiteSettings,
    Navigation,
    Footer,
    HomePage,
    CoursePages,
    WorkPages,
    TeacherPages,
    ArticlePages,
    CampusPages,
    CareersPage,
    QuizSettings,
    LeadSettings,
  ],
  // 任务队列（线索推送）：接口权限、定时执行、退避重试与中断回收见 src/jobs/config.ts
  jobs: jobsConfig,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  // 关闭 Payload 匿名遥测（数据发往境外 telemetry.payloadcms.com）
  telemetry: false,
  upload: {
    // 单个上传文件上限 50MB（视频）
    limits: { fileSize: 50 * 1024 * 1024 },
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [],
})
