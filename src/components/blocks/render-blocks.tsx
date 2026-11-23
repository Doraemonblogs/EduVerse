import { Container } from '@/components/common/container'
import { Section, type SectionTone } from '@/components/common/section'

import { CtaBlock } from './cta-block'
import { ImageTextBlock } from './image-text-block'
import { RichTextBlock } from './rich-text-block'
import { StatsBlock } from './stats-block'
import { TimelineBlock } from './timeline-block'
import type { BlockWidth, PageBlock } from './types'

type ContentBlock = Exclude<PageBlock, { blockType: 'cta' }>

/** 内容区块的底色：数据区块用米色色带制造节奏，其余为白底 */
const CONTENT_TONE: Record<ContentBlock['blockType'], SectionTone> = {
  richText: 'light',
  imageText: 'light',
  timeline: 'light',
  stats: 'paper',
}

type Group =
  | { kind: 'content'; tone: SectionTone; blocks: { block: ContentBlock; index: number }[] }
  | { kind: 'cta'; block: Extract<PageBlock, { blockType: 'cta' }>; index: number }

/**
 * 相邻且底色相同的内容区块合并到同一个 <Section>，避免上下留白叠加；
 * 页头是米色，紧跟其后的第一组若也是米色则改为白底。行动号召区块单独成段（深色）。
 */
function groupBlocks(blocks: PageBlock[]): Group[] {
  const groups: Group[] = []
  blocks.forEach((block, index) => {
    if (block.blockType === 'cta') {
      groups.push({ kind: 'cta', block, index })
      return
    }
    let tone = CONTENT_TONE[block.blockType]
    if (groups.length === 0 && tone === 'paper') tone = 'light'
    const last = groups.at(-1)
    if (last?.kind === 'content' && last.tone === tone) {
      last.blocks.push({ block, index })
    } else {
      groups.push({ kind: 'content', tone, blocks: [{ block, index }] })
    }
  })
  return groups
}

function ContentBlockView({ block, width }: { block: ContentBlock; width: BlockWidth }) {
  switch (block.blockType) {
    case 'richText':
      return <RichTextBlock block={block} width={width} />
    case 'imageText':
      return <ImageTextBlock block={block} width={width} />
    case 'stats':
      return <StatsBlock block={block} width={width} />
    case 'timeline':
      return <TimelineBlock block={block} width={width} />
    default:
      return null
  }
}

/** 渲染页面区块（pages.layout）。width 决定全部区块的版心 */
export function RenderBlocks({ blocks, width }: { blocks: PageBlock[]; width: BlockWidth }) {
  return (
    <>
      {groupBlocks(blocks).map((group, groupIndex, groups) => {
        if (group.kind === 'cta') {
          const key = group.block.id ?? `cta-${group.index}`
          return (
            <CtaBlock
              key={key}
              block={group.block}
              width={width}
              anchorId={`block-${key}`}
              endsPage={groupIndex === groups.length - 1}
            />
          )
        }
        const first = group.blocks[0]!
        return (
          <Section key={first.block.id ?? `group-${first.index}`} tone={group.tone}>
            <Container size={width} className="flex flex-col gap-16 md:gap-24">
              {group.blocks.map(({ block, index }) => (
                <ContentBlockView key={block.id ?? index} block={block} width={width} />
              ))}
            </Container>
          </Section>
        )
      })}
    </>
  )
}
