/**
 * 搜索页路径、搜索框的元素 id 与聚焦工具（搜索页与站点头部的搜索按钮共用；不依赖其它模块，客户端引入的体积可以忽略）。
 * 头部搜索按钮在已经位于 /search 时点击，直接把焦点放进搜索框。
 */

/** 搜索页路径（不含 basePath；next/link、next/form 会自动补上） */
export const SEARCH_PATH = '/search'

/** 搜索页搜索框的 id（<label htmlFor>、提示 / 错误的 id 前缀） */
export const SEARCH_INPUT_ID = 'site-search-input'

/** 把焦点放进搜索页的搜索框并选中已有文字；页面上没有搜索框时什么也不做 */
export function focusSearchInput(): void {
  const input = document.getElementById(SEARCH_INPUT_ID)
  if (!(input instanceof HTMLInputElement)) return
  input.focus()
  input.select()
}
