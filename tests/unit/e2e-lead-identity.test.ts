import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isIP } from 'node:net'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MAINLAND_PHONE_PATTERN } from '@/lib/validation/lead'

import type * as LeadIdentity from '../helpers/lead-identity'

/**
 * 端到端测试提交线索用的模拟身份（tests/helpers/lead-identity.ts）：
 * 任意两个用例（不同测试文件、项目、重试 / 重复、用例序号）的模拟 IP 与手机号都不能相同，
 * 否则并行运行时会互相触发按 IP / 手机号的限频与查重。
 */

let identity: typeof LeadIdentity

beforeEach(async () => {
  // 已分配的序号记录在模块内：每个用例重新加载，互不影响
  vi.resetModules()
  identity = await import('../helpers/lead-identity')
})

const E2E_DIR = path.resolve(__dirname, '../e2e')

function testInfo(
  project: string,
  { retry = 0, retries = 2, repeatEachIndex = 0, title = '用例' } = {},
) {
  return {
    project: { name: project, retries },
    retry,
    repeatEachIndex,
    titlePath: ['文件', title],
  }
}

describe('e2e 线索测试的模拟身份', () => {
  it('所有测试文件 × 项目 × 运行次数 × 用例序号的 IP 与手机号两两不同，且格式合法', () => {
    const { LEAD_SPECS, LEAD_PROJECTS, leadNamespace, testIp, testPhone } = identity
    const ips = new Set<string>()
    const phones = new Set<string>()
    let total = 0
    for (const spec of LEAD_SPECS) {
      for (const project of LEAD_PROJECTS) {
        // retries = 2：每次重复 3 次尝试，第 0–4 次重复共 15 次运行
        for (let repeatEachIndex = 0; repeatEachIndex < 5; repeatEachIndex += 1) {
          for (let retry = 0; retry <= 2; retry += 1) {
            for (let n = 0; n < 16; n += 1) {
              const ns = leadNamespace(
                spec,
                testInfo(project, { retry, repeatEachIndex, title: `用例 ${n}` }),
              )
              const ip = testIp(ns, n)
              const phone = testPhone(ns, n)
              expect(isIP(ip), ip).toBe(4)
              expect(ip.startsWith('198.18.'), ip).toBe(true)
              expect(phone).toMatch(MAINLAND_PHONE_PATTERN)
              // 种子数据的演示线索用 138 号段
              expect(phone.startsWith('138')).toBe(false)
              ips.add(ip)
              phones.add(phone)
              total += 1
            }
          }
        }
      }
    }
    expect(ips.size).toBe(total)
    expect(phones.size).toBe(total)
  })

  it('取值稳定：同一用例每次运行得到相同的 IP 与手机号，重试时换用新的', () => {
    const { leadNamespace, testIp, testPhone } = identity
    const first = leadNamespace('courses-list', testInfo('mobile'))
    const again = leadNamespace('courses-list', testInfo('mobile'))
    expect(testIp(first, 1)).toBe(testIp(again, 1))
    expect(testPhone(first, 1)).toBe(testPhone(again, 1))

    const retried = leadNamespace('courses-list', testInfo('mobile', { retry: 1 }))
    expect(testIp(retried, 1)).not.toBe(testIp(first, 1))
    expect(testPhone(retried, 1)).not.toBe(testPhone(first, 1))
  })

  it('同一测试文件里两个用例取了同一序号时直接报错；同一用例取 IP 与手机号不算重复', () => {
    const { leadNamespace, testIp, testPhone } = identity
    const a = leadNamespace('lead', testInfo('desktop', { title: '用例甲' }))
    const b = leadNamespace('lead', testInfo('desktop', { title: '用例乙' }))
    expect(() => {
      testIp(a, 3)
      testPhone(a, 3)
    }).not.toThrow()
    expect(() => testIp(b, 3)).toThrow(/序号 3 已被“文件 › 用例甲”使用/)
    // 另一个项目、另一个文件可以用同一序号
    expect(() =>
      testIp(leadNamespace('lead', testInfo('mobile', { title: '用例乙' })), 3),
    ).not.toThrow()
    expect(() =>
      testIp(leadNamespace('majors', testInfo('desktop', { title: '用例乙' })), 3),
    ).not.toThrow()
  })

  it('未登记的项目、超出范围的序号或运行次数直接报错，而不是悄悄生成重叠的值', () => {
    const { leadNamespace, testIp } = identity
    expect(() => leadNamespace('lead', testInfo('tablet'))).toThrow(/LEAD_PROJECTS/)
    expect(() => leadNamespace('lead', testInfo('desktop', { repeatEachIndex: 5 }))).toThrow(
      RangeError,
    )
    const ns = leadNamespace('lead', testInfo('desktop'))
    expect(() => testIp(ns, 16)).toThrow(RangeError)
    expect(() => testIp(ns, -1)).toThrow(RangeError)
    expect(() => testIp(ns, 1.5)).toThrow(RangeError)
  })

  it('登记的测试文件都存在；提交线索的测试文件各自使用以自己命名的命名空间', () => {
    const { LEAD_SPECS } = identity
    for (const spec of LEAD_SPECS) {
      expect(existsSync(path.join(E2E_DIR, `${spec}.e2e.spec.ts`)), spec).toBe(true)
    }
    const files = readdirSync(E2E_DIR).filter((file) => file.endsWith('.e2e.spec.ts'))
    for (const file of files) {
      const source = readFileSync(path.join(E2E_DIR, file), 'utf8')
      if (!/\btest(Ip|Phone)\(/.test(source)) continue
      const spec = file.replace(/\.e2e\.spec\.ts$/, '')
      const namespaces = [...source.matchAll(/leadNamespace\('([^']+)'/g)].map((m) => m[1])
      expect(namespaces.length, `${file} 应通过 leadNamespace 取模拟身份`).toBeGreaterThan(0)
      expect(new Set(namespaces), `${file} 只能使用自己的命名空间`).toEqual(new Set([spec]))
    }
  })
})
