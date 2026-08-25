import { describe, expect, it } from 'vitest'

import { paginationRange, parsePageParam, totalPageCount } from '@/lib/pagination'

describe('admin pagination helpers', () => {
  it('accepts positive integer page parameters', () => {
    expect(parsePageParam('3')).toBe(3)
    expect(parsePageParam(['4', '5'])).toBe(4)
  })

  it('normalizes missing, invalid, and unsafe page parameters', () => {
    expect(parsePageParam(undefined)).toBe(1)
    expect(parsePageParam('0')).toBe(1)
    expect(parsePageParam('-2')).toBe(1)
    expect(parsePageParam('2.5')).toBe(1)
    expect(parsePageParam('9007199254740992')).toBe(1)
  })

  it('produces inclusive Supabase range bounds', () => {
    expect(paginationRange(1, 25)).toEqual({ from: 0, to: 24 })
    expect(paginationRange(3, 25)).toEqual({ from: 50, to: 74 })
  })

  it('always exposes at least one UI page', () => {
    expect(totalPageCount(0, 25)).toBe(1)
    expect(totalPageCount(26, 25)).toBe(2)
  })
})
