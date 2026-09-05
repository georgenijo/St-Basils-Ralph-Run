import { describe, expect, it } from 'vitest'

import { subFromJwt } from './auth'

describe('subFromJwt', () => {
  it.each(['header..signature', 'header.eyJzdWIiOg.signature'])(
    'treats malformed payload %j as unauthenticated',
    (token) => {
      expect(subFromJwt(token)).toBeNull()
    }
  )
})
