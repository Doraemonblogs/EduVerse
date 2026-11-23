import type { Metadata } from 'next'

import { Container } from '@/components/common/container'
import { FilterBar } from '@/components/common/filter-bar'
import { PageHeader } from '@/components/common/page-header'
import { Section } from '@/components/common/section'
import { TutorialCard } from '@/components/tutorials/tutorial-card'
import { TutorialPlayer } from '@/components/tutorials/tutorial-player'
import { TutorialsListEmpty } from '@/components/tutorials/tutorials-list-empty'
import { tutorialsMetadataInput, tutorialVideoJsonLd } from '@/components/tutorials/tutorials-list'
import { getSiteUrl, isStaticPreview } from '@/config/site'
import { zh } from '@/i18n/zh'
import { getTutorialList, getTutorialPagesSettings } from '@/lib/data/tutorials'
import { readSearchParam, type SearchParamsInput } from '@/lib/search-params'
import { JsonLd } from '@/lib/seo/json-ld'
import { buildMetadata } from '@/lib/seo/metadata'
import {
  buildTutorialFilterRows,
  filterTutorials,
  findTutorial,
  hasActiveTutorialFilters,
  parseTutorialFilters,
} from '@/lib/tutorials/filters'
import { TUTORIAL_PLAY_PARAM, TUTORIALS_PATH } from '@/lib/tutorials/paths'

/**
 * 免费教程列表 /tutorials：标题区 → 两个维度单选筛选（专业方向 / 难度）→ 教程卡片网格 → 空状态；
 * 点击卡片打开播放弹窗（留资解锁或“点击后加载”的播放器），弹窗可通过 `?play=<id>` 深链接直接打开。
 * 筛选只存在于 URL（普通链接，不需要客户端 JS）；读取 searchParams 使页面按请求渲染，
 * 教程数据走 unstable_cache（后台保存后按标签失效），不同筛选组合共用一份缓存，渲染时过滤。
 * 收录：带任一筛选参数或 play 参数 → `noindex, follow`，canonical 一律是 /tutorials。
 * 教程不多，不分页；超过 24 个时按作品列表的做法加分页（paginate() + <Pagination>，页码参数与 play 并存）。
 */

type TutorialsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const t = zh.tutorials

/** 解析参数、过滤、查找深链接指向的教程（generateMetadata 与页面共用，数据来自同一份缓存） */
async function loadTutorialsPage(searchParamsPromise: Promise<SearchParamsInput>) {
  const [{ tutorials, facets }, searchParams] = await Promise.all([
    getTutorialList(),
    searchParamsPromise,
  ])
  const { filters, playId, noindex } = parseTutorialFilters(searchParams)
  const results = filterTutorials(tutorials, filters)
  // play 在全部已发布教程里查找（不受筛选影响）；找不到（不存在 / 已下线 / 格式不对）时不打开弹窗
  const playTarget = findTutorial(tutorials, playId)
  const playMissing =
    readSearchParam(searchParams, TUTORIAL_PLAY_PARAM) !== undefined && !playTarget
  return { tutorials, facets, filters, noindex, results, playTarget, playMissing }
}

export async function generateMetadata({ searchParams }: TutorialsPageProps): Promise<Metadata> {
  const [{ list }, { noindex, playTarget }] = await Promise.all([
    getTutorialPagesSettings(),
    loadTutorialsPage(searchParams),
  ])
  const metadata = await buildMetadata(tutorialsMetadataInput(list, playTarget))
  return noindex ? { ...metadata, robots: { index: false, follow: true } } : metadata
}

export default async function TutorialsPage({ searchParams }: TutorialsPageProps) {
  const [{ list, gate }, { tutorials, facets, filters, results, playTarget, playMissing }] =
    await Promise.all([getTutorialPagesSettings(), loadTutorialsPage(searchParams)])
  const hasActive = hasActiveTutorialFilters(filters)
  // 弹窗可打开的教程：当前结果 + 深链接指向、但被筛选掉的那一个
  const playable =
    playTarget && !results.some((item) => item.id === playTarget.id)
      ? [...results, playTarget]
      : results
  const videos = tutorialVideoJsonLd(results, getSiteUrl())

  return (
    <>
      <PageHeader
        title={list.title}
        description={list.description}
        breadcrumbs={[{ label: list.title, href: TUTORIALS_PATH }]}
      />
      <Section tone="light" className="pt-8 md:pt-12">
        {/* 第 4 列卡片贴着版心右缘：lg:avoid-floating-actions 给桌面端悬浮操作栏让出位置 */}
        <Container className="flex flex-col gap-10 md:gap-12 lg:avoid-floating-actions">
          {/* 还没有任何教程时不显示筛选栏（每行只有“全部 0”） */}
          {tutorials.length > 0 ? (
            <FilterBar
              label={t.filters.label}
              idPrefix="tutorial-filter"
              rows={buildTutorialFilterRows(tutorials, filters, facets)}
              resultCount={results.length}
              resultTemplate={t.filters.resultCount}
              optionCountTemplate={t.filters.optionCount}
              clearHref={hasActive ? TUTORIALS_PATH : null}
              notice={isStaticPreview ? t.filters.previewNotice : null}
            />
          ) : null}
          <TutorialPlayer tutorials={playable} gate={gate}>
            <div className="flex flex-col gap-6">
              {playMissing ? (
                <p
                  role="status"
                  className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground"
                >
                  {t.player.notFound}
                </p>
              ) : null}
              {results.length > 0 ? (
                <ul
                  role="list"
                  className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 xl:grid-cols-4"
                >
                  {results.map((tutorial, index) => (
                    <li key={tutorial.id}>
                      {/* 页面没有区块标题：教程标题用 h2；只有第一张封面提高加载优先级 */}
                      <TutorialCard tutorial={tutorial} priority={index === 0} />
                    </li>
                  ))}
                </ul>
              ) : (
                // 有教程但当前条件下没有结果 → 可清除筛选；一个教程都没有 → 预约试听
                <TutorialsListEmpty filtered={tutorials.length > 0} />
              )}
            </div>
          </TutorialPlayer>
        </Container>
      </Section>
      {videos.length > 0 ? <JsonLd data={videos} /> : null}
    </>
  )
}
