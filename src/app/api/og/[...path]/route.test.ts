import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { imageResponseState, mockLogWarn } = vi.hoisted(() => ({
  imageResponseState: { options: null as { fonts?: unknown[] } | null },
  mockLogWarn: vi.fn(),
}))

vi.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor(_element: unknown, options: { fonts?: unknown[] }) {
      super('image', { status: 200 })
      imageResponseState.options = options
    }
  },
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('logo')),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({ warn: mockLogWarn, error: vi.fn() })),
  },
}))

vi.mock('@/lib/logger.server', () => ({
  withRequestLogging: vi.fn((_route: string, handler: unknown) => handler),
}))

describe('Open Graph image font fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    imageResponseState.options = null
  })

  afterEach(() => vi.unstubAllGlobals())

  it('still returns an image when Google Fonts is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')))
    vi.stubGlobal('React', { createElement: vi.fn(() => null) })
    const { GET } = await import('./route')

    const response = await GET(new Request('https://example.com/api/og/home') as never, {
      params: Promise.resolve({ path: ['home'] }),
    })

    expect(response.status).toBe(200)
    expect(imageResponseState.options?.fonts).toEqual([])
    expect(mockLogWarn).toHaveBeenCalledTimes(2)
    expect(mockLogWarn).toHaveBeenCalledWith(
      'open_graph.font_load_failed',
      expect.objectContaining({ family: 'Cormorant Garamond', weight: 600 })
    )
  })
})
