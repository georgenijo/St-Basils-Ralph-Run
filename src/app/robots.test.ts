import { describe, expect, it } from 'vitest'

import robots from '@/app/robots'

describe('robots', () => {
  it('keeps private and development-only routes out of search results', () => {
    const result = robots()

    expect(result.rules).toEqual(
      expect.objectContaining({
        disallow: expect.arrayContaining(['/studio', '/admin', '/showcase']),
      })
    )
  })
})
