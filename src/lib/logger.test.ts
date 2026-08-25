import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLogger, redact, registerLogContextProvider } from '@/lib/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'debug')
    registerLogContextProvider(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('emits JSON records with level, message, and child context', () => {
    const write = vi.spyOn(globalThis.console, 'info').mockImplementation(() => undefined)

    createLogger({ service: 'web' }).child({ scope: 'payments' }).info('payment.received', {
      paymentId: 'pay_123',
    })

    expect(write).toHaveBeenCalledOnce()
    const record = JSON.parse(String(write.mock.calls[0][0]))
    expect(record).toMatchObject({
      level: 'info',
      message: 'payment.received',
      service: 'web',
      scope: 'payments',
      paymentId: 'pay_123',
    })
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('respects LOG_LEVEL', () => {
    vi.stubEnv('LOG_LEVEL', 'warn')
    const debug = vi.spyOn(globalThis.console, 'debug').mockImplementation(() => undefined)
    const warn = vi.spyOn(globalThis.console, 'warn').mockImplementation(() => undefined)
    const instance = createLogger()

    instance.debug('hidden')
    instance.warn('visible')

    expect(debug).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('merges request context without repeating it at each call site', () => {
    registerLogContextProvider(() => ({ requestId: 'req-123', route: '/api/example' }))
    const write = vi.spyOn(globalThis.console, 'error').mockImplementation(() => undefined)

    createLogger({ scope: 'example' }).error('failed', { error: new Error('boom') })

    const record = JSON.parse(String(write.mock.calls[0][0]))
    expect(record).toMatchObject({ requestId: 'req-123', route: '/api/example', scope: 'example' })
    expect(record.error).toMatchObject({ name: 'Error', message: 'boom' })
    expect(record.error.stack).toContain('Error: boom')
  })

  it('redacts JWTs, cookie headers, service keys, passwords, and email addresses', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.c2lnbmF0dXJlMTIzNDU2'
    const serviceKey = 'sb_secret_this-is-a-production-service-key'
    const value = redact({
      headers: { cookie: 'sb-auth=very-secret-cookie', authorization: `Bearer ${jwt}` },
      password: 'correct horse battery staple',
      detail: `token=${jwt} Cookie: session=abc; refresh=def ${serviceKey} admin@example.com`,
      safe: 'visible',
    })
    const serialized = JSON.stringify(value)

    expect(serialized).not.toContain(jwt)
    expect(serialized).not.toContain('very-secret-cookie')
    expect(serialized).not.toContain('correct horse battery staple')
    expect(serialized).not.toContain(serviceKey)
    expect(serialized).not.toContain('session=abc')
    expect(serialized).not.toContain('refresh=def')
    expect(serialized).not.toContain('admin@example.com')
    expect(value).toMatchObject({ safe: 'visible' })
  })

  it('omits request bodies and safely handles circular values', () => {
    const circular: Record<string, unknown> = { body: { private: true } }
    circular.self = circular

    expect(redact(circular)).toEqual({ body: '[REQUEST_BODY_OMITTED]', self: '[CIRCULAR]' })
  })

  it('is a no-op in a client runtime', () => {
    vi.stubGlobal('window', {})
    const write = vi.spyOn(globalThis.console, 'error').mockImplementation(() => undefined)

    createLogger().error('browser error')

    expect(write).not.toHaveBeenCalled()
  })
})
