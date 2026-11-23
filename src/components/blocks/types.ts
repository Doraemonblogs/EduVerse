import type { Page } from '@/payload-types'

/** 页面区块（pages.layout 的一项） */
export type PageBlock = Page['layout'][number]

/** 区块所在版心：site 常规 1280px；prose 正文 736px（隐私政策、纯文字页面） */
export type BlockWidth = 'site' | 'prose'
