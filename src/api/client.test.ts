import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGmailStatus } from './client'

describe('getGmailStatus', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns connected: false when userId is empty', async () => {
    const result = await getGmailStatus('')
    expect(result).toEqual({ connected: false, message: 'No user' })
  })

  it('returns connected: false when userId is whitespace', async () => {
    const result = await getGmailStatus('   ')
    expect(result).toEqual({ connected: false, message: 'No user' })
  })

  it('returns connected: true when API returns connected true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: true, email: 'test@example.com' }),
      })
    )
    const result = await getGmailStatus('user-123')
    expect(result).toEqual({
      connected: true,
      email: 'test@example.com',
      picture: null,
      message: undefined,
    })
  })

  it('returns connected: false when API returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      })
    )
    const result = await getGmailStatus('user-123')
    expect(result.connected).toBe(false)
    expect(result.message).toBe('Unauthorized')
  })

  it('returns connected: false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await getGmailStatus('user-123')
    expect(result.connected).toBe(false)
    expect(result.message).toContain('Network error')
  })

  it('parses malformed JSON safely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })
    )
    const result = await getGmailStatus('user-123')
    expect(result.connected).toBe(false)
  })
})
