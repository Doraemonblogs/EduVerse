import { describe, expect, it } from 'vitest'

import { workByline, workImageAlt, workLightboxItems } from '@/lib/works/format'
import {
  compareWorks,
  mergeRelatedWorks,
  sortWorks,
  toSoftwareTags,
  toWorkCard,
  toWorkGallery,
  toWorkVideo,
  type WorkCardSource,
} from '@/lib/works/mappers'
import { parseWorkId, workPath } from '@/lib/works/paths'
import { ALLOWED_VIDEO_HOSTS, isAllowedVideoEmbedUrl } from '@/lib/works/video'
import type { Media } from '@/payload-types'

import { workCard, workDetail } from '../helpers/work-fixtures'

/**
 * 作品：Payload 文档 → 视图模型、排序、相关作品、视频白名单、展示工具。
 */

const media = (name: string, overrides: Partial<Media> = {}): Media => ({
  id: 1,
  alt: `${name}（占位图）`,
  url: `/api/media/file/${name}.png`,
  mimeType: 'image/png',
  width: 1200,
  height: 1600,
  sizes: {
    card: { url: `/api/media/file/${name}-800x1067.webp`, width: 800, height: 1067 },
    thumbnail: { url: `/api/media/file/${name}-400x533.webp`, width: 400, height: 533 },
    hero: { url: `/api/media/file/${name}-1200x1600.webp`, width: 1200, height: 1600 },
    og: { url: `/api/media/file/${name}-1200x630.webp`, width: 1200, height: 630 },
  },
  updatedAt: '',
  createdAt: '',
  ...overrides,
})

const discipline = (status: 'draft' | 'published') => ({
  id: 7,
  name: '三维动画',
  shortName: null,
  slug: '3d-animation',
  _status: status,
})

const source = (overrides: Partial<WorkCardSource> = {}): WorkCardSource => ({
  id: 12,
  title: '《机甲少女·澜》角色建模',
  author: { displayName: ' Momo ', cohortLabel: '' },
  cover: media('mecha'),
  featured: null,
  publishedAt: '2026-11-01T00:00:00.000Z',
  discipline: discipline('published'),
  software: [
    { id: 1, name: 'ZBrush', slug: 'zbrush' },
    5,
    { id: 2, name: 'Maya', slug: 'maya' },
    { id: 1, name: 'ZBrush', slug: 'zbrush' },
  ],
  ...overrides,
})

describe('toWorkCard', () => {
  it('封面取 card 尺寸并保留宽高比；署名去空格，空届别为 null；软件只取已填充的 slug 并去重', () => {
    expect(toWorkCard(source())).toEqual({
      id: 12,
      title: '《机甲少女·澜》角色建模',
      cover: {
        src: '/api/media/file/mecha-800x1067.webp',
        alt: 'mecha（占位图）',
        width: 800,
        height: 1067,
      },
      authorName: 'Momo',
      cohortLabel: null,
      discipline: { id: 7, name: '三维动画', shortName: '三维动画', slug: '3d-animation' },
      software: ['zbrush', 'maya'],
      featured: false,
      publishedAt: '2026-11-01T00:00:00.000Z',
    })
  })

  it('专业方向是草稿或未填充时为 null（作品照常展示）', () => {
    expect(toWorkCard(source({ discipline: discipline('draft') })).discipline).toBeNull()
    expect(toWorkCard(source({ discipline: 7 })).discipline).toBeNull()
    expect(toWorkCard(source({ cover: 3, publishedAt: null })).cover).toBeNull()
  })

  it('toSoftwareTags：保持后台顺序，按 slug 去重', () => {
    expect(toSoftwareTags(source().software)).toEqual([
      { slug: 'zbrush', name: 'ZBrush' },
      { slug: 'maya', name: 'Maya' },
    ])
    expect(toSoftwareTags(null)).toEqual([])
  })
})

describe('作品排序', () => {
  it('发布时间降序，相同再按 ID 降序；没有发布时间的排在最后', () => {
    const items = [
      { id: 1, publishedAt: '2026-10-01T00:00:00.000Z' },
      { id: 2, publishedAt: null },
      { id: 3, publishedAt: '2026-11-01T00:00:00.000Z' },
      { id: 4, publishedAt: '2026-10-01T00:00:00.000Z' },
      { id: 5, publishedAt: 'not a date' },
    ]
    expect(sortWorks(items).map((w) => w.id)).toEqual([3, 4, 1, 5, 2])
    // 不修改传入的数组
    expect(items.map((w) => w.id)).toEqual([1, 2, 3, 4, 5])
    expect(compareWorks(items[0]!, items[0]!)).toBe(0)
  })
})

describe('toWorkGallery', () => {
  it('大图 hero、缩略图 thumbnail，说明去空格；未填充的图片跳过', () => {
    expect(
      toWorkGallery([
        { image: media('a'), caption: ' 过程稿 ' },
        { image: 9, caption: '未填充' },
        { image: media('b', { sizes: {} }), caption: null },
      ]),
    ).toEqual([
      {
        image: {
          src: '/api/media/file/a-1200x1600.webp',
          alt: 'a（占位图）',
          width: 1200,
          height: 1600,
        },
        thumb: {
          src: '/api/media/file/a-400x533.webp',
          alt: 'a（占位图）',
          width: 400,
          height: 533,
        },
        caption: '过程稿',
      },
      // 没有生成尺寸时退回原图
      {
        image: { src: '/api/media/file/b.png', alt: 'b（占位图）', width: 1200, height: 1600 },
        thumb: { src: '/api/media/file/b.png', alt: 'b（占位图）', width: 1200, height: 1600 },
        caption: null,
      },
    ])
    expect(toWorkGallery(null)).toEqual([])
  })
})

describe('toWorkVideo', () => {
  const poster = { src: '/p.webp', alt: '', width: 1920, height: 1080 }

  it('白名单内的外部播放器地址：embed', () => {
    expect(
      toWorkVideo(
        {
          kind: 'embed',
          embedUrl: ' https://player.bilibili.com/player.html?bvid=BV1ED00000w1 ',
        },
        poster,
      ),
    ).toEqual({
      kind: 'embed',
      embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1ED00000w1',
    })
  })

  it.each([
    'http://player.bilibili.com/player.html?bvid=BV1',
    'https://evil.example.com/player.html',
    'https://player.bilibili.com.evil.com/x',
    'javascript:alert(1)',
    '',
  ])('不合法的地址当作无视频：%s', (embedUrl) => {
    expect(toWorkVideo({ kind: 'embed', embedUrl }, poster)).toBeNull()
  })

  it('上传的视频文件：地址补 basePath、带类型与封面；不是视频或未填充时为 null', () => {
    const file = media('clip', { url: '/api/media/file/clip.mp4', mimeType: 'video/mp4' })
    expect(toWorkVideo({ kind: 'file', file }, poster)).toEqual({
      kind: 'file',
      src: '/api/media/file/clip.mp4',
      mimeType: 'video/mp4',
      poster,
    })
    expect(toWorkVideo({ kind: 'file', file: media('img') }, poster)).toBeNull()
    expect(toWorkVideo({ kind: 'file', file: 3 }, poster)).toBeNull()
    expect(toWorkVideo({ kind: 'none' }, poster)).toBeNull()
    expect(toWorkVideo(undefined, poster)).toBeNull()
  })
})

describe('isAllowedVideoEmbedUrl', () => {
  it('只允许白名单域名的 https 地址（不带端口与账号）', () => {
    for (const host of ALLOWED_VIDEO_HOSTS) {
      expect(isAllowedVideoEmbedUrl(`https://${host}/player`)).toBe(true)
    }
    expect(isAllowedVideoEmbedUrl('https://player.bilibili.com:8443/player')).toBe(false)
    expect(isAllowedVideoEmbedUrl('https://user:pass@player.bilibili.com/player')).toBe(false)
    expect(isAllowedVideoEmbedUrl('//player.bilibili.com/player')).toBe(false)
    expect(isAllowedVideoEmbedUrl(null)).toBe(false)
    expect(isAllowedVideoEmbedUrl(42)).toBe(false)
  })
})

describe('mergeRelatedWorks', () => {
  it('同课程在前、再补同专业；排除本作品与重复项，最多 limit 件', () => {
    const w = (id: number) => workCard({ id })
    const related = mergeRelatedWorks([w(9), w(1), w(8)], [w(8), w(7), w(1), w(6), w(5)], 1, 4)
    expect(related.map((x) => x.id)).toEqual([9, 8, 7, 6])
    expect(mergeRelatedWorks([], [], 1, 8)).toEqual([])
  })
})

describe('作品路径与展示工具', () => {
  it('workPath / parseWorkId：只接受不带前导 0 的正整数', () => {
    expect(workPath(12)).toBe('/works/12')
    expect(parseWorkId('12')).toBe(12)
    expect(parseWorkId('2147483647')).toBe(2147483647)
    for (const value of ['0', '012', '-1', '1.5', 'abc', '1e3', '', '2147483648', '99999999999']) {
      expect(parseWorkId(value)).toBeNull()
    }
  })

  it('workByline：化名与届别之间用“ · ”，只有其一时只显示其一', () => {
    expect(workByline({ authorName: '林同学', cohortLabel: '2026 届' })).toBe('林同学 · 2026 届')
    expect(workByline({ authorName: '林同学', cohortLabel: null })).toBe('林同学')
    expect(workByline({ authorName: null, cohortLabel: null })).toBe('')
  })

  it('workImageAlt：媒体库填写的替代文字优先，空白时用作品名', () => {
    expect(workImageAlt({ alt: '机甲正面图' }, '机甲')).toBe('机甲正面图')
    expect(workImageAlt({ alt: '  ' }, '机甲')).toBe('机甲')
    expect(workImageAlt(null, '机甲')).toBe('机甲')
  })

  it('workLightboxItems：封面在前，其后是图集；没有封面时只有图集', () => {
    const item = {
      image: { src: '/g-hero.webp', alt: '过程稿', width: 1920, height: 1080 },
      thumb: { src: '/g-thumb.webp', alt: '过程稿', width: 400, height: 225 },
      caption: '过程稿',
    }
    const detail = workDetail({ gallery: [item] })
    expect(workLightboxItems(detail)).toEqual([
      { image: detail.heroImage, thumb: detail.cover, caption: null },
      item,
    ])
    expect(workLightboxItems({ ...detail, heroImage: null })).toEqual([item])
  })
})
