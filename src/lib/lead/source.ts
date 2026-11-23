/**
 * 留资来源追踪（纯函数，客户端与测试共用）。
 * 同一会话内记录“首次触达”：落地页、外部来源、UTM 参数。
 */
export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const

export type LandingInfo = {
  landingUrl: string
  referrer: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

const camel = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
} as const

export function buildLandingInfo(href: string, referrer: string): LandingInfo {
  const url = new URL(href)
  const info: LandingInfo = {
    landingUrl: href.slice(0, 500),
    // 站内跳转不算外部来源
    referrer: referrer && !sameOrigin(referrer, url.origin) ? referrer.slice(0, 500) : '',
  }
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key)
    if (value) info[camel[key]] = value.slice(0, 100)
  }
  return info
}

/** 是否需要更新已记录的首次触达：带新的 UTM 参数进入时视为新一次投放触达 */
export function shouldReplaceLanding(existing: LandingInfo | null, next: LandingInfo): boolean {
  if (!existing) return true
  return (
    Boolean(next.utmSource && next.utmSource !== existing.utmSource) ||
    Boolean(next.utmCampaign && next.utmCampaign !== existing.utmCampaign)
  )
}

function sameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}
