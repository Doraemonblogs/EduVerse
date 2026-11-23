import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, EyeIcon, UserRoundIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { ArticleCard } from '@/components/articles/article-card'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Container } from '@/components/common/container'
import { RichText } from '@/components/common/rich-text'
import { Section } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { CourseCard } from '@/components/course/course-card'
import { shiftRichTextHeadings } from '@/components/course/major/rich-text-headings'
import type { LeadFormConfig } from '@/components/lead/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { articleViewsLabel, normalizeViews } from '@/lib/articles/format'
import { ARTICLES_PATH, articleCategoryPath, articlePath } from '@/lib/articles/paths'
import type { ArticleDetail, ArticlePagesSettings } from '@/lib/articles/types'
import { formatCohortDate, formatMessage, toBeijingIsoDate } from '@/lib/course/format'
import type { CourseCardData } from '@/lib/course/types'
import type { BreadcrumbItem } from '@/lib/seo/json-ld'

import { ArticleSidebar } from './article-sidebar'
import { ArticleViewBeacon } from './article-view-beacon'

const t = zh.articles.detail

export const ARTICLE_TITLE_ID = 'article-title'
const RELATED_COURSES_TITLE_ID = 'article-related-courses-title'
const RELATED_ARTICLES_TITLE_ID = 'article-related-articles-title'

/** 首屏封面：≥ xl 正文栏 736px，lg 约占视口 55%，以下通栏 */
const COVER_SIZES = '(min-width: 1280px) 736px, (min-width: 1024px) 56vw, 100vw'

/** 正文图片与封面同宽 */
const CONTENT_IMAGE_SIZES = COVER_SIZES

/** 相关课程：正文栏宽 ≥ 36rem 时两列（xl 每张约 360px），否则通栏 */
const COURSE_SIZES =
  '(min-width: 1280px) 360px, (min-width: 1024px) 54vw, (min-width: 640px) 46vw, 100vw'

/** 面包屑：首页 › 资讯 › 分类 › 标题（文章没有分类时省略分类一级） */
export function articleBreadcrumbs(
  article: Pick<ArticleDetail, 'slug' | 'title' | 'category'>,
  listTitle: string,
): BreadcrumbItem[] {
  return [
    { label: listTitle, href: ARTICLES_PATH },
    ...(article.category
      ? [{ label: article.category.name, href: articleCategoryPath(article.category.slug) }]
      : []),
    { label: article.title, href: articlePath(article.slug) },
  ]
}

export type ArticleDetailViewProps = {
  article: ArticleDetail
  settings: ArticlePagesSettings
  /** 侧栏热门课程 */
  hotCourses: CourseCardData[]
  leadConfig: LeadFormConfig
  /** 课程卡片“近期开班”的当前时间（同一次渲染共用） */
  now: Date
}

/**
 * 资讯详情页主体（服务端组件，不取数据）：
 * 米色标题区（面包屑、分类、h1、作者 / 发布时间 / 阅读量（为 0 时不显示））→ 两栏（正文栏：封面、正文、返回列表，其下相关课程；
 * 右栏：热门课程 + 吸顶留资卡片）→ 相关文章（米色通栏，图文列表）。
 * 两栏用 grid 排布：侧栏在 DOM 里紧跟正文，移动端单栏时排在正文之后、相关课程之前；
 * 桌面端侧栏跨两行（与正文、相关课程等高），留资卡片在整个两栏范围内吸顶。
 * 正文标题整体接在 h1 之下（最高一级为 h2）。页面加载后上报一次阅读（ArticleViewBeacon）。
 */
export function ArticleDetailView({
  article,
  settings,
  hotCourses,
  leadConfig,
  now,
}: ArticleDetailViewProps) {
  const date = formatCohortDate(article.publishedAt)
  const cover = article.heroImage
  // 阅读量为 0（新文章，或缓存里还是 0）时不显示，不出现“0 次阅读”
  const views = normalizeViews(article.views)

  return (
    <>
      <ArticleViewBeacon articleId={article.id} />

      <article aria-labelledby={ARTICLE_TITLE_ID}>
        <Section tone="paper" spacing="sm">
          <Container className="flex flex-col gap-5 md:gap-6 lg:avoid-floating-actions">
            <Breadcrumbs items={articleBreadcrumbs(article, settings.list.title)} />
            <header className="flex max-w-(--container-prose) flex-col items-start gap-4">
              {article.category ? (
                <Badge asChild variant="inverse">
                  <Link href={articleCategoryPath(article.category.slug)} prefetch={false}>
                    <span className="sr-only">{t.category}：</span>
                    {article.category.name}
                  </Link>
                </Badge>
              ) : null}
              <h1 id={ARTICLE_TITLE_ID} className="text-h2 text-balance text-foreground">
                {article.title}
              </h1>
              <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {article.authorName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRoundIcon aria-hidden className="size-4" />
                    <span className="sr-only">{t.author}：</span>
                    {article.authorName}
                  </span>
                ) : null}
                {date ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon aria-hidden className="size-4" />
                    <time dateTime={toBeijingIsoDate(article.publishedAt)} className="numeric">
                      <span className="sr-only">{t.publishedAt}</span>
                      {date}
                    </time>
                  </span>
                ) : null}
                {views > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <EyeIcon aria-hidden className="size-4" />
                    <span className="numeric">{articleViewsLabel(views)}</span>
                  </span>
                ) : null}
              </p>
            </header>
          </Container>
        </Section>

        <Section tone="light" spacing="none" className="pt-8 pb-section md:pt-12">
          {/* 留资卡片吸顶后贴着版心右缘：lg:avoid-floating-actions 给桌面端悬浮操作栏让出右侧位置
              （全页三个版心都加，右缘对齐） */}
          <Container className="grid grid-cols-1 gap-y-16 lg:avoid-floating-actions lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-20 xl:grid-cols-[minmax(0,46rem)_22.5rem] xl:justify-between">
            <div className="flex min-w-0 flex-col gap-8 md:gap-10 lg:col-start-1 lg:row-start-1">
              {cover ? (
                <figure className="overflow-hidden rounded-md bg-muted">
                  <Image
                    src={cover.src}
                    alt={cover.alt || article.title}
                    width={cover.width}
                    height={cover.height}
                    sizes={COVER_SIZES}
                    loading="eager"
                    fetchPriority="high"
                    className="aspect-[16/9] w-full object-cover"
                  />
                </figure>
              ) : null}

              <RichText
                data={shiftRichTextHeadings(article.content, 2)}
                imageSizes={CONTENT_IMAGE_SIZES}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                {article.category ? (
                  <p className="text-sm text-muted-foreground">
                    {t.category}：
                    <Link
                      href={articleCategoryPath(article.category.slug)}
                      prefetch={false}
                      className="font-medium text-emphasis underline-offset-4 hover:underline"
                    >
                      {article.category.name}
                    </Link>
                  </p>
                ) : null}
                <Button asChild variant="outline" size="sm" className="ms-auto">
                  <Link href={ARTICLES_PATH} prefetch={false}>
                    <ArrowLeftIcon aria-hidden />
                    {t.backToList}
                  </Link>
                </Button>
              </div>
            </div>

            <ArticleSidebar
              hotCourses={hotCourses}
              settings={settings.detail}
              leadConfig={leadConfig}
              className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
            />

            {article.relatedCourses.length > 0 ? (
              <section
                aria-labelledby={RELATED_COURSES_TITLE_ID}
                className="@container flex min-w-0 flex-col gap-6 md:gap-8 lg:col-start-1 lg:row-start-2"
              >
                <h2 id={RELATED_COURSES_TITLE_ID} className="text-h3 text-foreground">
                  {t.relatedCourses}
                </h2>
                <ul role="list" className="grid grid-cols-1 gap-5 @xl:grid-cols-2">
                  {article.relatedCourses.map((course) => (
                    <li key={course.id}>
                      <CourseCard course={course} now={now} imageSizes={COURSE_SIZES} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </Container>
        </Section>
      </article>

      {article.relatedArticles.length > 0 ? (
        <Section tone="paper" aria-labelledby={RELATED_ARTICLES_TITLE_ID}>
          {/* 右列文章与“更多{分类}”链接贴着版心右缘：同样给悬浮操作栏让位，与上方两栏的右缘对齐 */}
          <Container className="flex flex-col gap-8 md:gap-10 lg:avoid-floating-actions">
            <SectionHeading
              id={RELATED_ARTICLES_TITLE_ID}
              title={t.relatedArticles}
              actions={
                article.category ? (
                  <Button asChild variant="link" className="min-h-11 text-sm md:text-base">
                    <Link href={articleCategoryPath(article.category.slug)} prefetch={false}>
                      {formatMessage(t.moreInCategory, { name: article.category.name })}
                      <ArrowRightIcon aria-hidden />
                    </Link>
                  </Button>
                ) : null
              }
            />
            {/* 图文列表行（与首页“最新资讯”一致）：≥ lg 两列，行与行之间细线分隔 */}
            <ul
              role="list"
              className="grid grid-cols-1 border-t border-border lg:grid-cols-2 lg:gap-x-12"
            >
              {article.relatedArticles.map((related) => (
                <li key={related.id} className="border-b border-border">
                  <ArticleCard article={related} variant="row" />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </>
  )
}
