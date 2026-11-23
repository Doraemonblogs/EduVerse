// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VideoFacade } from '@/components/common/video-facade'
import { zh } from '@/i18n/zh'

/**
 * 通用“点击后加载”外部播放器（作品详情、免费教程弹窗共用）：首屏不插入 iframe，
 * 点击后才插入白名单地址的 iframe；地址缺失或不在白名单时显示“视频暂不可用”，永远不插入 iframe。
 * 作品详情里的用法另见 work-detail-media.test.tsx；真实浏览器中的第三方请求由 e2e 覆盖。
 */
afterEach(cleanup)

const EMBED = 'https://player.bilibili.com/player.html?bvid=BV1ED00000a1'
const POSTER = { src: '/api/media/file/cover-800x450.webp', alt: '封面', width: 800, height: 450 }

describe('VideoFacade', () => {
  it('首屏只有封面与播放按钮；点击后插入白名单 iframe、焦点移到播放器，并调用 onPlay', () => {
    const onPlay = vi.fn()
    render(
      <VideoFacade
        embedUrl={EMBED}
        title="Blender 入门"
        poster={POSTER}
        posterSizes="100vw"
        onPlay={onPlay}
      />,
    )
    expect(document.querySelector('iframe')).toBeNull()
    // 弹窗等非首屏位置默认懒加载封面
    expect(document.querySelector('img')?.getAttribute('loading')).toBe('lazy')

    fireEvent.click(screen.getByRole('button', { name: '播放视频：Blender 入门' }))
    const frame = document.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe(EMBED)
    expect(frame?.getAttribute('title')).toBe('Blender 入门（视频播放器）')
    expect(frame?.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
    expect(document.activeElement).toBe(frame)
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /^播放视频/ })).toBeNull()
  })

  it('首屏大图（posterPreload）不懒加载封面', () => {
    render(
      <VideoFacade
        embedUrl={EMBED}
        title="作品"
        poster={POSTER}
        posterSizes="100vw"
        posterPreload
      />,
    )
    expect(document.querySelector('img')?.getAttribute('loading')).not.toBe('lazy')
  })

  it('没有封面时只显示播放按钮', () => {
    render(<VideoFacade embedUrl={EMBED} title="作品" poster={null} posterSizes="100vw" />)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByRole('button', { name: '播放视频：作品' })).toBeTruthy()
  })

  it.each([
    ['地址为空', null],
    ['不在白名单的域名', 'https://evil.example.com/player.html?bvid=BV1ED00000a1'],
    ['非 https', 'http://player.bilibili.com/player.html?bvid=BV1ED00000a1'],
    ['javascript 地址', 'javascript:alert(1)'],
  ])('%s：显示“视频暂不可用”，没有播放按钮，永远不插入 iframe', (_label, embedUrl) => {
    render(<VideoFacade embedUrl={embedUrl} title="教程" poster={POSTER} posterSizes="100vw" />)
    expect(screen.getByText(zh.video.unavailable)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
    // 封面作装饰（alt 为空），提示文字才是内容
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('')
  })
})
