// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { wrapIndex } from '@/components/common/lightbox'
import { playableVideo, WorkMedia } from '@/components/works/detail/work-media'
import type { WorkGalleryItem } from '@/lib/works/types'

import { workDetail } from '../helpers/work-fixtures'

/**
 * 作品详情的主媒体区与灯箱（jsdom）：视频“点击后加载”、大图与缩略图打开灯箱、
 * 键盘切换与序号、关闭后焦点归还。真实浏览器中的第三方请求、滑动与视觉由 e2e 覆盖。
 */
afterEach(cleanup)

const EMBED = 'https://player.bilibili.com/player.html?bvid=BV1ED00000w1'

const galleryItem = (n: number, caption: string | null = `过程稿 ${n}`): WorkGalleryItem => ({
  image: {
    src: `/api/media/file/g${n}-1920.webp`,
    alt: `图集第 ${n} 张`,
    width: 1920,
    height: 1080,
  },
  thumb: { src: `/api/media/file/g${n}-400.webp`, alt: `图集第 ${n} 张`, width: 400, height: 225 },
  caption,
})

/** 灯箱里当前的序号（可见文字，读屏另有完整说法） */
const counter = (dialog: HTMLElement) => dialog.querySelector('[aria-live] [aria-hidden]')

describe('wrapIndex', () => {
  it('序号首尾循环', () => {
    expect(wrapIndex(0, 3)).toBe(0)
    expect(wrapIndex(3, 3)).toBe(0)
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(5, 0)).toBe(0)
  })
})

describe('playableVideo', () => {
  it('白名单外的外部播放器地址当作没有视频；视频文件原样保留', () => {
    expect(playableVideo(null)).toBeNull()
    expect(playableVideo({ kind: 'embed', embedUrl: EMBED })).toEqual({
      kind: 'embed',
      embedUrl: EMBED,
    })
    expect(playableVideo({ kind: 'embed', embedUrl: 'https://evil.example.com/v' })).toBeNull()
    expect(playableVideo({ kind: 'embed', embedUrl: 'http://player.bilibili.com/x' })).toBeNull()
    const file = { kind: 'file', src: '/api/media/file/v.mp4', mimeType: 'video/mp4', poster: null }
    expect(playableVideo({ ...file, kind: 'file' })).toEqual(file)
  })
})

describe('WorkMedia：大图与灯箱', () => {
  it('没有视频：主图是打开灯箱的按钮（预加载、不懒加载），缩略图包含封面与图集', () => {
    render(<WorkMedia work={workDetail({ gallery: [galleryItem(1), galleryItem(2)] })} />)
    const stage = screen.getByRole('button', { name: '查看大图：《灯塔守望者》角色动画短片' })
    const image = within(stage).getByRole('img', { hidden: true })
    expect(image.getAttribute('loading')).not.toBe('lazy')
    expect(stage.textContent).toContain('共 3 张')

    const thumbs = within(screen.getByRole('list', { name: '作品图集' })).getAllByRole('button')
    expect(thumbs.map((thumb) => thumb.getAttribute('aria-label'))).toEqual([
      '查看第 1 张大图：《灯塔守望者》角色动画短片',
      '查看第 2 张大图：过程稿 1',
      '查看第 3 张大图：过程稿 2',
    ])
    for (const thumb of thumbs) expect(thumb.getAttribute('aria-haspopup')).toBe('dialog')
    expect(document.querySelector('iframe, video')).toBeNull()
  })

  it('只有一张图时不显示缩略图，也没有切换按钮', () => {
    render(<WorkMedia work={workDetail({ gallery: [] })} />)
    expect(screen.queryByRole('list', { name: '作品图集' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^查看大图/ }))
    const dialog = screen.getByRole('dialog', { name: '《灯塔守望者》角色动画短片' })
    expect(counter(dialog)?.textContent).toBe('1 / 1')
    expect(within(dialog).queryByRole('button', { name: '下一张' })).toBeNull()
  })

  it('从缩略图打开对应的图片：← / → 与按钮切换并首尾循环，序号同步；Esc 关闭后焦点回到该缩略图', async () => {
    render(
      <WorkMedia
        work={workDetail({ gallery: [galleryItem(1), galleryItem(2, null), galleryItem(3)] })}
      />,
    )
    const thumbs = within(screen.getByRole('list', { name: '作品图集' })).getAllByRole('button')
    const opener = thumbs[1]!
    opener.focus()
    fireEvent.click(opener)

    const dialog = await screen.findByRole('dialog', { name: '《灯塔守望者》角色动画短片' })
    expect(dialog.textContent).toContain('按左右方向键切换图片')
    expect(counter(dialog)?.textContent).toBe('2 / 4')
    expect(within(dialog).getByText('第 2 张，共 4 张')).toBeTruthy()
    expect(within(dialog).getByRole('img', { name: '图集第 1 张' })).toBeTruthy()
    expect(within(dialog).getByText('过程稿 1')).toBeTruthy()

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(counter(dialog)?.textContent).toBe('3 / 4')
    // 没有说明文字的图片：说明区域为空
    expect(within(dialog).queryByText(/^过程稿/)).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: '下一张' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '下一张' }))
    expect(counter(dialog)?.textContent).toBe('1 / 4')

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(counter(dialog)?.textContent).toBe('4 / 4')
    fireEvent.click(within(dialog).getByRole('button', { name: '上一张' }))
    expect(counter(dialog)?.textContent).toBe('3 / 4')

    // 带修饰键的方向键（浏览器前进后退等快捷键）不切换
    fireEvent.keyDown(dialog, { key: 'ArrowRight', altKey: true })
    expect(counter(dialog)?.textContent).toBe('3 / 4')

    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('关闭按钮关闭灯箱，焦点回到主图', async () => {
    render(<WorkMedia work={workDetail({ gallery: [galleryItem(1)] })} />)
    const stage = screen.getByRole('button', { name: '查看大图：《灯塔守望者》角色动画短片' })
    fireEvent.click(stage)
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: '关闭大图' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(stage))
  })
})

describe('WorkMedia：视频', () => {
  it('外部播放器：首屏只有封面与播放按钮，点击后才插入白名单 iframe，焦点移到播放器', () => {
    render(<WorkMedia work={workDetail({ video: { kind: 'embed', embedUrl: EMBED } })} />)
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByText(/点击播放后才会加载播放器/)).toBeTruthy()
    // 有视频时主区域不是大图按钮，图片通过缩略图打开
    expect(
      within(screen.getByRole('list', { name: '作品图集' })).getAllByRole('button'),
    ).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '播放视频：《灯塔守望者》角色动画短片' }))
    const frame = document.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('src')).toBe(EMBED)
    expect(frame?.getAttribute('title')).toBe('《灯塔守望者》角色动画短片（视频播放器）')
    expect(frame?.getAttribute('allow')).toBe('fullscreen')
    expect(frame?.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
    expect(frame?.getAttribute('loading')).toBe('lazy')
    expect(document.activeElement).toBe(frame)
    expect(screen.queryByRole('button', { name: /^播放视频/ })).toBeNull()
  })

  it('播放按钮与播放器自己裁切圆角，外层容器不裁切：画在按钮外侧的焦点描边不会被整圈裁掉', () => {
    render(<WorkMedia work={workDetail({ video: { kind: 'embed', embedUrl: EMBED } })} />)
    const play = screen.getByRole('button', { name: /^播放视频/ })
    // 按钮铺满容器（inset-0）：容器 overflow-hidden 时描边完全落在裁切区域外
    expect(play.parentElement?.className).not.toMatch(/\boverflow-hidden\b/)
    expect(play.className).toMatch(/\boverflow-hidden\b/)
    expect(play.className).toMatch(/\brounded-md\b/)

    fireEvent.click(play)
    expect(document.querySelector('iframe')?.className).toMatch(/\brounded-md\b/)
  })

  it('白名单外的地址：显示大图，不出现播放按钮与 iframe', () => {
    render(
      <WorkMedia
        work={workDetail({ video: { kind: 'embed', embedUrl: 'https://evil.example.com/v' } })}
      />,
    )
    expect(screen.queryByRole('button', { name: /^播放视频/ })).toBeNull()
    expect(screen.getByRole('button', { name: /^查看大图/ })).toBeTruthy()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('上传的视频文件：原生播放器，不预加载，封面作 poster', () => {
    render(
      <WorkMedia
        work={workDetail({
          video: {
            kind: 'file',
            src: '/api/media/file/reel.mp4',
            mimeType: 'video/mp4',
            poster: { src: '/api/media/file/poster.webp', alt: '', width: 1920, height: 1080 },
          },
        })}
      />,
    )
    const video = document.querySelector('video')
    expect(video?.hasAttribute('controls')).toBe(true)
    expect(video?.getAttribute('preload')).toBe('none')
    expect(video?.getAttribute('poster')).toBe('/api/media/file/poster.webp')
    expect(video?.getAttribute('aria-label')).toBe('《灯塔守望者》角色动画短片')
    const source = video?.querySelector('source')
    expect(source?.getAttribute('src')).toBe('/api/media/file/reel.mp4')
    expect(source?.getAttribute('type')).toBe('video/mp4')
    expect(document.querySelector('iframe')).toBeNull()
  })
})
