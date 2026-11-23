/**
 * 生成兜底分享图 src/lib/seo/default-share-image.png（1200×630，原创图形，不引用任何外部素材）。
 *
 * 只在后台没有可用分享图时使用（内容 SEO 分享图 → 内容封面 → 站点设置「默认 SEO」分享图 → 这张图）。
 * 图已提交到仓库，平时不需要运行；改版时执行：
 *   pnpm exec tsx scripts/seo/generate-default-share-image.ts
 * 颜色取自设计令牌（src/styles/globals.css：ink-950 / paper / brand-500）；文字用系统字体渲染，
 * 不同机器上字形可能略有差异，以提交的图片为准。
 */
import path from 'node:path'

import sharp from 'sharp'

const WIDTH = 1200
const HEIGHT = 630
const OUT = path.resolve('src/lib/seo/default-share-image.png')

/** 设计令牌：ink-950、ink-800、ink-400、paper、brand-500 */
const INK = '#0b0c0f'
const INK_LINE = '#1c1f26'
const INK_MUTED = '#9ea3ad'
const PAPER = '#f4f2ee'
const BRAND = '#ff5b14'

const LATIN_FONTS = "'Space Grotesk','Inter','DejaVu Sans',sans-serif"
const CJK_FONTS = "'Noto Sans CJK SC','Source Han Sans SC','WenQuanYi Zen Hei',sans-serif"

/** 背景网格：每 60px 一条细线，右侧留出图形区 */
function grid(): string {
  const lines: string[] = []
  for (let x = 60; x < WIDTH; x += 60) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${HEIGHT}" />`)
  }
  for (let y = 60; y < HEIGHT; y += 60) {
    lines.push(`<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" />`)
  }
  return `<g stroke="${INK_LINE}" stroke-width="1">${lines.join('')}</g>`
}

/** 右侧抽象图形：几何体线框 + 品牌橙色块（暗示三维 / 设计方向，不含文字） */
function shapes(): string {
  return `
    <g transform="translate(840 315)">
      <circle r="190" fill="none" stroke="${INK_MUTED}" stroke-opacity="0.35" stroke-width="2" />
      <circle r="120" fill="none" stroke="${INK_MUTED}" stroke-opacity="0.25" stroke-width="2" />
      <polygon points="0,-150 130,75 -130,75" fill="none" stroke="${PAPER}" stroke-opacity="0.7" stroke-width="3" />
      <polygon points="0,-150 130,75 0,20" fill="${PAPER}" fill-opacity="0.08" />
      <rect x="70" y="-170" width="120" height="120" fill="${BRAND}" />
      <rect x="-200" y="110" width="60" height="60" fill="none" stroke="${BRAND}" stroke-width="3" />
    </g>`
}

function svg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="100%" height="100%" fill="${INK}" />
    ${grid()}
    ${shapes()}
    <rect x="96" y="210" width="72" height="8" fill="${BRAND}" />
    <text x="92" y="318" font-family="${LATIN_FONTS}" font-size="104" font-weight="700" fill="${PAPER}" letter-spacing="-2">EduVerse</text>
    <text x="96" y="398" font-family="${CJK_FONTS}" font-size="52" font-weight="600" fill="${PAPER}" letter-spacing="8">数艺学院</text>
    <text x="96" y="462" font-family="${LATIN_FONTS}" font-size="24" fill="${INK_MUTED}" letter-spacing="6">DIGITAL ART &amp; DESIGN</text>
  </svg>`
}

async function main() {
  const info = await sharp(Buffer.from(svg()))
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(OUT)
  if (info.width !== WIDTH || info.height !== HEIGHT) {
    throw new Error(`尺寸不对：${info.width}×${info.height}`)
  }
  console.info(
    `已生成 ${path.relative(process.cwd(), OUT)}（${info.width}×${info.height}，${info.size} 字节）`,
  )
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
