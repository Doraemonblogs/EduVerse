import { describe, expect, it } from 'vitest'

import { HOME_SECTION_ORDER } from '@/components/home/constants'
import {
  HOME_HERO_GAP_CLASS,
  HOME_SECTION_SEPARATOR_CLASS,
  type HomeSectionKey,
  homePageFrames,
  homeSectionTones,
} from '@/components/home/rhythm'

const ALL = HOME_SECTION_ORDER.filter((key): key is HomeSectionKey => key !== 'hero')
const without = (...keys: HomeSectionKey[]) => ALL.filter((key) => !keys.includes(key))
const tonesOf = (keys: readonly HomeSectionKey[]) => [...homeSectionTones(keys).values()]

describe('首页整页节奏（区块色调与分隔）', () => {
  it('全部区块开启时与各区块组件的默认色调一致，深浅交替、没有分隔线', () => {
    expect(Object.fromEntries(homeSectionTones(ALL))).toEqual({
      quickEntries: 'light',
      hotDisciplines: 'paper',
      courses: 'light',
      works: 'dark',
      stories: 'light',
      partners: 'paper',
      teachers: 'light',
      campuses: 'paper',
      articles: 'light',
      leadForm: 'dark',
    })
    const frames = homePageFrames(ALL)
    expect(frames.hero).toBeUndefined()
    for (const key of ALL) expect(frames[key].className, key).toBeUndefined()
    expect(frames.hotDisciplines.tone).toBe('paper')
    expect(frames.stories.tone).toBe('light')
  })

  it('任意关闭若干区块后，相邻的白底 / 米色区块仍交替出现', () => {
    // 逐个关闭、以及关闭任意两个区块的全部组合
    const combos: HomeSectionKey[][] = [
      ...ALL.map((key) => [key]),
      ...ALL.flatMap((a, i) => ALL.slice(i + 1).map((b) => [a, b])),
    ]
    for (const off of combos) {
      const rendered = without(...off)
      const tones = tonesOf(rendered)
      tones.forEach((tone, index) => {
        if (index === 0 || tone === 'dark') return
        expect(tone, `关闭 ${off.join('、')} 后第 ${index + 1} 个区块`).not.toBe(tones[index - 1])
      })
    }
  })

  it('学员作品与预约试听总是深色；主视觉与深色区块之后的第一个浅色区块为白底', () => {
    const rendered = without('quickEntries', 'stories')
    const tones = homeSectionTones(rendered)
    expect(tones.get('works')).toBe('dark')
    expect(tones.get('leadForm')).toBe('dark')
    // 快速了解关闭：热门专业紧跟主视觉，改为白底（主视觉的白底延续下来）
    expect(tones.get('hotDisciplines')).toBe('light')
    expect(tones.get('courses')).toBe('paper')
    // 学员故事关闭：作品（深）之后的合作企业为白底
    expect(tones.get('partners')).toBe('light')
    expect(tones.get('teachers')).toBe('paper')
  })

  it('两个深色区块直接相接时，后一个加顶部分隔线', () => {
    const frames = homePageFrames(['courses', 'works', 'leadForm'])
    expect(frames.works.className).toBeUndefined()
    expect(frames.leadForm.className).toBe(HOME_SECTION_SEPARATOR_CLASS)
  })

  it('主视觉之后紧接深色区块、或没有其它区块时，主视觉补底部留白', () => {
    expect(homePageFrames(['works', 'leadForm']).hero).toBe(HOME_HERO_GAP_CLASS)
    expect(homePageFrames(['leadForm']).hero).toBe(HOME_HERO_GAP_CLASS)
    expect(homePageFrames([]).hero).toBe(HOME_HERO_GAP_CLASS)
    expect(homePageFrames(['courses', 'works']).hero).toBeUndefined()
  })
})
