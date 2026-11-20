/**
 * 本地生成占位图（不外链、不抓取任何第三方图片）。
 * 同一个 seed 永远生成同一张图，重置种子数据后图片保持一致。
 */
import sharp from 'sharp'

export type Aspect = '3:4' | '4:5' | '1:1' | '4:3' | '16:9' | '2:3' | '12:5' | '3:4m' | '2:1'

export type PlaceholderKind = 'art' | 'avatar' | 'wordmark' | 'space' | 'qr'

export type PlaceholderOptions = {
  kind: PlaceholderKind
  /** 决定构图的随机种子（通常用内容 slug / 标题） */
  seed: string
  /** 主色相 0–360（通常取所属专业方向的色相） */
  hue: number
  aspect: Aspect
  /** 角标文字，如“占位图 · 三维动画”；wordmark / avatar 为主体文字 */
  label: string
  /** 长边像素 */
  size?: number
}

const CJK_FONTS =
  "'Noto Sans CJK SC','Source Han Sans SC','PingFang SC','WenQuanYi Zen Hei','Microsoft YaHei',sans-serif"

const ASPECTS: Record<Aspect, [number, number]> = {
  '3:4': [3, 4],
  '4:5': [4, 5],
  '1:1': [1, 1],
  '4:3': [4, 3],
  '16:9': [16, 9],
  '2:3': [2, 3],
  '12:5': [12, 5],
  '3:4m': [3, 4],
  '2:1': [2, 1],
}

/** 由字符串得到 32 位种子（FNV-1a） */
export function hashString(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 可复现的伪随机数（mulberry32） */
export function createRandom(seed: string): () => number {
  let a = hashString(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dimensions(aspect: Aspect, size: number): { width: number; height: number } {
  const [w, h] = ASPECTS[aspect]
  return w >= h
    ? { width: size, height: Math.round((size * h) / w) }
    : { width: Math.round((size * w) / h), height: size }
}

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  )

const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`

function labelTag(label: string, width: number, height: number, dark = true): string {
  const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.035))
  const padX = fontSize * 0.7
  const boxW = label.length * fontSize * 1.02 + padX * 2
  const boxH = fontSize * 1.9
  const x = Math.round(Math.min(width, height) * 0.04)
  const y = height - x - boxH
  return `<g>
    <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="${fontSize * 0.2}" fill="${dark ? 'rgba(11,12,15,0.55)' : 'rgba(255,255,255,0.8)'}"/>
    <text x="${x + padX}" y="${y + boxH * 0.66}" font-family="${CJK_FONTS}" font-size="${fontSize}" fill="${dark ? '#f3f1ec' : '#111317'}">${escapeXml(label)}</text>
  </g>`
}

/** 抽象“作品”构图：渐变底 + 光斑 + 几何体 + 细线 */
function artSvg(o: PlaceholderOptions, width: number, height: number): string {
  const rnd = createRandom(o.seed)
  const h = o.hue + (rnd() - 0.5) * 30
  const h2 = h + 25 + rnd() * 70
  const angle = Math.round(rnd() * 360)
  const min = Math.min(width, height)
  const shapes: string[] = []

  for (let i = 0; i < 3; i++) {
    const cx = rnd() * width
    const cy = rnd() * height
    const r = min * (0.25 + rnd() * 0.45)
    shapes.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow${i})" opacity="${0.5 + rnd() * 0.4}"/>`,
    )
  }
  for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) {
    const w = min * (0.15 + rnd() * 0.4)
    const x = rnd() * (width - w)
    const y = rnd() * (height - w)
    const rot = Math.round(rnd() * 90)
    shapes.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${w * (0.4 + rnd())}" rx="${rnd() < 0.5 ? 0 : w * 0.08}" transform="rotate(${rot} ${x + w / 2} ${y + w / 2})" fill="${hsl(h2 + rnd() * 40, 55, 30 + rnd() * 40, 0.35 + rnd() * 0.3)}"/>`,
    )
  }
  const lines = Array.from({ length: 6 + Math.floor(rnd() * 6) }, (_, i) => {
    const y = (height / 12) * (i + 1) + rnd() * 20
    return `<line x1="0" y1="${y}" x2="${width}" y2="${y - width * (rnd() - 0.5) * 0.4}" stroke="${hsl(h, 30, 90, 0.08)}" stroke-width="${1 + rnd() * 2}"/>`
  }).join('')

  const glows = [0, 1, 2]
    .map(
      (i) => `<radialGradient id="glow${i}">
        <stop offset="0%" stop-color="${hsl(h + i * 35, 80, 65 + i * 5, 0.9)}"/>
        <stop offset="100%" stop-color="${hsl(h + i * 35, 80, 50, 0)}"/>
      </radialGradient>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" gradientTransform="rotate(${angle} 0.5 0.5)">
        <stop offset="0%" stop-color="${hsl(h, 45, 18)}"/>
        <stop offset="55%" stop-color="${hsl(h2, 50, 32)}"/>
        <stop offset="100%" stop-color="${hsl(h2 + 30, 40, 12)}"/>
      </linearGradient>
      ${glows}
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    ${shapes.join('')}
    ${lines}
    ${labelTag(o.label, width, height)}
  </svg>`
}

/** 头像：渐变圆底 + 姓氏 */
function avatarSvg(o: PlaceholderOptions, width: number, height: number): string {
  const rnd = createRandom(o.seed)
  const h = o.hue + (rnd() - 0.5) * 40
  const char = escapeXml(Array.from(o.label)[0] ?? '?')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${hsl(h, 35, 72)}"/><stop offset="100%" stop-color="${hsl(h + 40, 40, 38)}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${width * 0.5}" cy="${height * 1.05}" r="${width * 0.45}" fill="${hsl(h, 30, 20, 0.35)}"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="${CJK_FONTS}" font-size="${width * 0.36}" font-weight="700" fill="rgba(255,255,255,0.92)">${char}</text>
  </svg>`
}

/** 文字标（合作企业 Logo 占位）：浅底 + 色块符号 + 名称 */
function wordmarkSvg(o: PlaceholderOptions, width: number, height: number): string {
  const rnd = createRandom(o.seed)
  const h = o.hue
  const fontSize = Math.min(height * 0.2, (width * 0.62) / Math.max(o.label.length, 1))
  const mark = height * 0.22
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <g transform="translate(${width * 0.1} ${height / 2 - mark / 2})">
      ${
        rnd() < 0.5
          ? `<circle cx="${mark / 2}" cy="${mark / 2}" r="${mark / 2}" fill="${hsl(h, 55, 40)}"/>`
          : `<rect width="${mark}" height="${mark}" rx="${mark * 0.18}" transform="rotate(${rnd() < 0.5 ? 45 : 0} ${mark / 2} ${mark / 2})" fill="${hsl(h, 55, 40)}"/>`
      }
    </g>
    <text x="${width * 0.1 + mark * 1.4}" y="52%" dominant-baseline="middle" font-family="${CJK_FONTS}" font-size="${fontSize}" font-weight="600" fill="#111317">${escapeXml(o.label)}</text>
  </svg>`
}

/** 空间照片占位（校区环境）：透视墙面 + 窗格 */
function spaceSvg(o: PlaceholderOptions, width: number, height: number): string {
  const rnd = createRandom(o.seed)
  const h = o.hue
  const cols = 4 + Math.floor(rnd() * 3)
  const windows = Array.from({ length: cols }, (_, i) => {
    const x = width * 0.08 + (width * 0.84 * i) / cols
    return `<rect x="${x}" y="${height * 0.18}" width="${(width * 0.84) / cols - 12}" height="${height * 0.38}" fill="${hsl(h + 180, 30, 80 + rnd() * 10, 0.85)}"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${hsl(h, 12, 55)}"/><stop offset="100%" stop-color="${hsl(h, 15, 25)}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="${hsl(h, 10, 88)}"/>
    ${windows}
    <polygon points="0,${height * 0.68} ${width},${height * 0.68} ${width},${height} 0,${height}" fill="url(#floor)"/>
    <rect x="${width * (0.15 + rnd() * 0.3)}" y="${height * 0.55}" width="${width * 0.35}" height="${height * 0.16}" rx="6" fill="${hsl(h, 35, 30)}"/>
    ${labelTag(o.label, width, height)}
  </svg>`
}

/** 示例二维码：明显的占位图案，不可扫描 */
function qrSvg(o: PlaceholderOptions, width: number): string {
  const rnd = createRandom(o.seed)
  const n = 21
  const cell = (width * 0.8) / n
  const off = width * 0.1
  const cells: string[] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
      if (!finder && rnd() < 0.45)
        cells.push(
          `<rect x="${off + x * cell}" y="${off + y * cell}" width="${cell}" height="${cell}"/>`,
        )
    }
  const finder = (x: number, y: number) =>
    `<rect x="${off + x * cell}" y="${off + y * cell}" width="${cell * 7}" height="${cell * 7}" fill="none" stroke="#111317" stroke-width="${cell}"/><rect x="${off + (x + 2) * cell}" y="${off + (y + 2) * cell}" width="${cell * 3}" height="${cell * 3}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <g fill="#111317">${cells.join('')}${finder(0.5, 0.5)}${finder(13.5, 0.5)}${finder(0.5, 13.5)}</g>
    <rect x="${width * 0.3}" y="${width * 0.42}" width="${width * 0.4}" height="${width * 0.16}" fill="#ffffff"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="${CJK_FONTS}" font-size="${width * 0.06}" fill="#111317">${escapeXml(o.label)}</text>
  </svg>`
}

export type GeneratedImage = {
  data: Buffer
  mimetype: string
  filename: string
  width: number
  height: number
}

/**
 * 生成占位图。SEED_IMAGE_SCALE（0–1）可整体缩小尺寸，测试时用来加速。
 */
export async function generatePlaceholder(
  o: PlaceholderOptions,
  filename: string,
): Promise<GeneratedImage> {
  const scale = Math.min(1, Math.max(0.1, Number(process.env.SEED_IMAGE_SCALE ?? 1)))
  const size = Math.round((o.size ?? 1600) * scale)
  const { width, height } =
    o.kind === 'qr' ? { width: size, height: size } : dimensions(o.aspect, size)

  const svg =
    o.kind === 'avatar'
      ? avatarSvg(o, width, height)
      : o.kind === 'wordmark'
        ? wordmarkSvg(o, width, height)
        : o.kind === 'space'
          ? spaceSvg(o, width, height)
          : o.kind === 'qr'
            ? qrSvg(o, width)
            : artSvg(o, width, height)

  const lossless = o.kind === 'wordmark' || o.kind === 'qr'
  const image = sharp(Buffer.from(svg))
  const data = lossless
    ? await image.png({ compressionLevel: 9 }).toBuffer()
    : await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer()

  return {
    data,
    mimetype: lossless ? 'image/png' : 'image/jpeg',
    filename: `${filename}.${lossless ? 'png' : 'jpg'}`,
    width,
    height,
  }
}
