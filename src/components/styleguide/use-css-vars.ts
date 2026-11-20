'use client'

import { type RefObject, useCallback, useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/**
 * 读取元素（默认 <html>）上 CSS 自定义属性的计算值。
 * 服务端渲染与水合阶段返回空对象，挂载后自动以真实值重新渲染。
 * 调用方传入的 names 应为稳定引用（模块级常量或 props）。
 */
export function useCssVars(
  names: readonly string[],
  ref?: RefObject<HTMLElement | null>,
): Record<string, string> {
  const getSnapshot = useCallback(() => {
    const el = ref ? ref.current : document.documentElement
    if (!el) return ''
    const style = getComputedStyle(el)
    return JSON.stringify(names.map((name) => style.getPropertyValue(`--${name}`).trim()))
  }, [names, ref])

  const snapshot = useSyncExternalStore(noopSubscribe, getSnapshot, () => '')
  if (!snapshot) return {}
  const values = JSON.parse(snapshot) as string[]
  return Object.fromEntries(names.map((name, i) => [name, values[i] ?? '']))
}
