import Image from 'next/image'

import { zh } from '@/i18n/zh'
import { formatMessage } from '@/lib/course/format'
import type { CourseProject } from '@/lib/course/types'
import { cn } from '@/lib/utils'

/** 主栏宽度的约 2/5（主栏在 ≥ 1024 时与 360px 侧栏并排） */
const PROJECT_IMAGE_SIZES =
  '(min-width: 1360px) 340px, (min-width: 1024px) 24vw, (min-width: 640px) 40vw, 100vw'

type ProjectListProps = {
  projects: CourseProject[]
  className?: string
}

/**
 * 实训项目（服务端组件）：编号、项目名（h3）、说明，配图可选。
 * 主栏足够宽时图左文右，窄时图在上；没有配图的项目只显示文字。空数组不渲染。
 */
export function ProjectList({ projects, className }: ProjectListProps) {
  if (projects.length === 0) return null
  return (
    <ol role="list" className={cn('flex flex-col gap-8 @xl:gap-6', className)}>
      {projects.map((project, index) => (
        <li
          key={`${index}-${project.title}`}
          className={cn(
            'grid gap-4 @xl:items-center @xl:gap-8',
            project.image && '@xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
          )}
        >
          {project.image ? (
            <div className="aspect-video overflow-hidden rounded-md bg-muted">
              <Image
                src={project.image.src}
                alt={project.image.alt || project.title}
                width={project.image.width}
                height={project.image.height}
                sizes={PROJECT_IMAGE_SIZES}
                className="size-full object-cover"
              />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col gap-2">
            <p className="numeric text-sm font-semibold text-emphasis">
              {formatMessage(zh.course.detail.projectIndex, {
                index: String(index + 1).padStart(2, '0'),
              })}
            </p>
            <h3 className="text-h4 text-foreground">{project.title}</h3>
            {project.description ? (
              <p className="text-base text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
