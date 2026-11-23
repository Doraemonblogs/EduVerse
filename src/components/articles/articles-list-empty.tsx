import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { zh } from '@/i18n/zh'
import { COURSES_PATH } from '@/lib/course/paths'
import { cn } from '@/lib/utils'

const t = zh.articles.list

/**
 * 资讯列表的空状态（服务端组件）：还没有任何已发布的资讯时显示说明 + 专业课程入口。
 * 分类页不会出现空状态：没有已发布文章的分类不在分类导航里，访问它返回 404。
 */
export function ArticlesListEmpty({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="articles-list-empty-title"
      className={cn(
        'flex flex-col items-start gap-4 rounded-md bg-muted px-5 py-8 md:px-10 md:py-12',
        className,
      )}
    >
      <h2 id="articles-list-empty-title" className="text-h3 text-foreground">
        {t.emptyTitle}
      </h2>
      <p className="max-w-2xl text-base text-muted-foreground">{t.emptyDescription}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={COURSES_PATH} prefetch={false}>
            {t.viewCourses}
          </Link>
        </Button>
      </div>
    </section>
  )
}
