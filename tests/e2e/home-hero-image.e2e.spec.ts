import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

/**
 * 首页主视觉第一张（首屏最大内容 LCP）的图片在真实浏览器里挑到的候选不小于实际绘制宽度：
 * 横幅框在各断点是固定宽高比、图片 object-cover 铺满，框比图片“高”时绘制宽度大于框宽，
 * sizes（src/lib/home/cover-sizes.ts）须按裁切放大。单元测试固定了 sizes 字符串与框的宽高比类名，
 * 这里在真实布局（版心留白、悬浮栏让位）下验证两者没有走样；并验证预加载与 <img> 用的是同一个候选（只下载一次）。
 * 每个宽度单独一个用例（新的浏览器上下文、空缓存），避免先前宽度下载的大图影响候选选择。
 */

type HeroImageFacts = {
  /** 浏览器选中的 srcset 候选宽度（/_next/image 的 w 参数） */
  candidate: number
  /** object-cover 的绘制宽度（CSS 像素） */
  drawn: number
  dpr: number
  /** 原图地址（/_next/image 的 url 参数） */
  file: string
}

async function readHeroImage(page: Page): Promise<HeroImageFacts> {
  const img = page.getByRole('region', { name: '主视觉' }).locator('picture img').first()
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true)
  return img.evaluate(async (el: HTMLImageElement) => {
    const box = el.getBoundingClientRect()
    const url = new URL(el.currentSrc)
    // naturalWidth 会按候选密度折算，不带 srcset 重新解码一次才是文件本身的宽高比
    const probe = new Image()
    probe.src = el.currentSrc
    await probe.decode()
    const ratio = probe.naturalWidth / probe.naturalHeight
    return {
      candidate: Number(url.searchParams.get('w')),
      drawn: Math.max(box.width, box.height * ratio),
      dpr: window.devicePixelRatio,
      file: url.searchParams.get('url') ?? '',
    }
  })
}

/** 记录页面对 /_next/image 的请求（按原图地址分组，值为请求过的完整地址） */
function recordImageRequests(page: Page): Map<string, Set<string>> {
  const requests = new Map<string, Set<string>>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!url.pathname.endsWith('/_next/image')) return
    const file = url.searchParams.get('url') ?? ''
    requests.set(file, (requests.get(file) ?? new Set()).add(request.url()))
  })
  return requests
}

async function expectHeroImageSharp(page: Page) {
  const requests = recordImageRequests(page)
  await page.goto('/')
  const facts = await readHeroImage(page)
  expect(facts.candidate, `候选宽度（${JSON.stringify(facts)}）`).toBeGreaterThanOrEqual(
    Math.floor(facts.drawn * facts.dpr),
  )
  // 预加载与 <img> / <source> 的 sizes 一致时，第一张只请求一次
  expect([...(requests.get(facts.file) ?? [])], '第一张主视觉图只下载一次').toHaveLength(1)
}

test.describe('首页主视觉图片（LCP）', () => {
  // 各断点的框：sm 3:2、md 16:10、lg 2:1（悬浮栏让位）、xl 12:5、≥ 1360px 版心封顶
  for (const width of [640, 768, 1024, 1280, 1440]) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 800 } })

      test('桌面图挑到的候选不小于 object-cover 的绘制宽度，且只下载一次', async ({
        page,
        isMobile,
      }) => {
        test.skip(isMobile, '桌面图（≥ 640px）只在桌面项目里按宽度逐个验证')
        await expectHeroImageSharp(page)
      })
    })
  }

  test('移动端图挑到的候选不小于 object-cover 的绘制宽度，且只下载一次', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, '移动端图（< 640px）在移动端项目（390px，高像素密度）里验证')
    await expectHeroImageSharp(page)
  })
})
