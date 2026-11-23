import type { Metadata } from 'next'

import { Container } from '@/components/common/container'
import { PageHeader } from '@/components/common/page-header'
import { Section } from '@/components/common/section'
import { QUIZ_PATH } from '@/components/quiz/constants'
import { QuizEmpty } from '@/components/quiz/quiz-empty'
import { QuizRunner } from '@/components/quiz/quiz-runner'
import { zh } from '@/i18n/zh'
import { getLeadFormConfig } from '@/lib/data/lead-form'
import { getQuizData, getQuizSettings } from '@/lib/data/quiz'
import { isQuizAvailable } from '@/lib/quiz/mappers'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 职业测试 /quiz：标题区（后台「职业测试设置 · 开始页」的标题与说明，面包屑 + BreadcrumbList）→
 * 答题区（QuizRunner：开始页 → 每屏一题 → 结果摘要 → 留资后展开完整报告）。
 * 静态页面：题目、专业方向、课程与设置走 unstable_cache，后台保存后按缓存标签即时失效；
 * 课程卡片的“近期开班”在浏览器里按当前日期过滤，不依赖重新生成。
 * 后台还没有题目或已发布的专业方向时显示空状态。
 */

export async function generateMetadata(): Promise<Metadata> {
  const { intro, seo } = await getQuizSettings()
  return buildMetadata({
    seo,
    title: intro.title,
    description: intro.description,
    path: QUIZ_PATH,
  })
}

export default async function QuizPage() {
  const [data, settings, leadConfig] = await Promise.all([
    getQuizData(),
    getQuizSettings(),
    getLeadFormConfig(),
  ])

  return (
    <>
      <PageHeader
        title={settings.intro.title}
        description={settings.intro.description}
        breadcrumbs={[{ label: zh.quiz.page.breadcrumb, href: QUIZ_PATH }]}
      />
      <Section tone="light" className="pt-8 md:pt-12">
        {/* 结果页的摘要封面、第三张课程卡片贴着版心右缘：桌面端给悬浮操作栏让位 */}
        <Container className="lg:avoid-floating-actions">
          {isQuizAvailable(data) ? (
            <QuizRunner
              questions={data.questions}
              disciplines={data.disciplines}
              settings={{ intro: settings.intro, result: settings.result }}
              leadConfig={leadConfig}
            />
          ) : (
            <QuizEmpty />
          )}
        </Container>
      </Section>
    </>
  )
}
