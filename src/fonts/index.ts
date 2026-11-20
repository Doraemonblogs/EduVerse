import localFont from 'next/font/local'

/**
 * 拉丁展示字体（Space Grotesk，SIL OFL 1.1，许可证见同目录 SpaceGrotesk-OFL.txt）。
 * 仅包含拉丁字符子集（约 22KB），用于英文眉标、数字与标题中的西文；
 * 中文始终回退到系统字体栈，不下载任何中文字体。
 */
export const fontDisplay = localFont({
  src: './SpaceGrotesk-Latin-Variable.woff2',
  variable: '--font-space-grotesk',
  weight: '300 700',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})
