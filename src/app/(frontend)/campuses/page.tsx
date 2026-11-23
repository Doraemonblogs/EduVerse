import type { Metadata } from 'next'

import { CampusList } from '@/components/campuses/campus-list'
import { Container } from '@/components/common/container'
import { PageHeader } from '@/components/common/page-header'
import { Section } from '@/components/common/section'
import { CAMPUSES_PATH } from '@/lib/campuses/paths'
import { getCampusCards, getCampusPagesSettings } from '@/lib/data/campuses'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * 校区列表 /campuses：全部已发布校区（后台排序）的卡片网格，标题 / 简介 / SEO 来自后台「校区页面设置」。
 * 静态页面：校区或设置在后台保存后按缓存标签即时失效；另每小时重新生成一次兜底。
 * 页面没有结尾表单，页脚的行动号召横幅照常显示。
 */

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const { list } = await getCampusPagesSettings()
  return buildMetadata({
    seo: list.seo,
    title: list.title,
    description: list.description,
    path: CAMPUSES_PATH,
  })
}

export default async function CampusesPage() {
  const [{ list }, campuses] = await Promise.all([getCampusPagesSettings(), getCampusCards()])

  return (
    <>
      <PageHeader
        title={list.title}
        description={list.description}
        breadcrumbs={[{ label: list.title, href: CAMPUSES_PATH }]}
      />
      <Section tone="light" className="pt-8 md:pt-12">
        {/* 第三列卡片的地图链接贴着版心右缘：lg:avoid-floating-actions 给桌面端悬浮操作栏让出位置 */}
        <Container className="lg:avoid-floating-actions">
          <CampusList campuses={campuses} />
        </Container>
      </Section>
    </>
  )
}
