import { describe, expect, it } from 'vitest'

import { withBasePath } from '@/lib/base-path'

describe('withBasePath', () => {
  it('子路径部署时给站内绝对路径加前缀', () => {
    expect(withBasePath('/api/media/file/a.webp', '/EduVerse')).toBe(
      '/EduVerse/api/media/file/a.webp',
    )
    expect(withBasePath('/', '/EduVerse')).toBe('/EduVerse/')
  })

  it('已带前缀、外链、协议相对地址与相对路径保持不变', () => {
    expect(withBasePath('/EduVerse/a.png', '/EduVerse')).toBe('/EduVerse/a.png')
    expect(withBasePath('/EduVerse', '/EduVerse')).toBe('/EduVerse')
    expect(withBasePath('https://example.com/a.png', '/EduVerse')).toBe('https://example.com/a.png')
    expect(withBasePath('//cdn.example.com/a.png', '/EduVerse')).toBe('//cdn.example.com/a.png')
    expect(withBasePath('a.png', '/EduVerse')).toBe('a.png')
  })

  it('根路径部署时原样返回', () => {
    expect(withBasePath('/api/media/file/a.webp', '')).toBe('/api/media/file/a.webp')
  })
})
