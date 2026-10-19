import { describe, expect, it, vi } from 'vitest'
import {
  extractHuggingFaceBalance,
  HuggingFaceSessionCollector
} from '../../src/main/providers/HuggingFaceSessionCollector'
import { huggingFaceBrowserSessionDefinition } from '../../src/main/providers/HuggingFaceBrowserSession'

describe('HuggingFaceSessionCollector', () => {
  it('verifies only authenticated Hugging Face user identities', async () => {
    const authenticated = await huggingFaceBrowserSessionDefinition.verify({
      fetch: vi.fn(async () => new Response(JSON.stringify({ type: 'user', id: '123', name: 'octocat' }), { status: 200 }))
    })
    const signedOut = await huggingFaceBrowserSessionDefinition.verify({
      fetch: vi.fn(async () => new Response('', { status: 401 }))
    })

    expect(authenticated).toEqual({ accountLabel: 'octocat' })
    expect(signedOut).toBeUndefined()
  })

  it('extracts the balance from encoded billing component props', () => {
    const html = '<div data-target="BillingOverviewMetronome" data-props="{&quot;entity&quot;:{&quot;currentBalanceUsd&quot;:&quot;12.50&quot;}}"></div>'
    expect(extractHuggingFaceBalance(html)).toBe(12.5)
  })

  it('rejects missing or conflicting balances', () => {
    expect(() => extractHuggingFaceBalance('<html></html>')).toThrow(/missing or ambiguous/i)
    const html = [1, 2]
      .map((value) => `<div data-target="BillingOverviewMetronome" data-props="{&quot;entity&quot;:{&quot;currentBalanceUsd&quot;:${value}}}"></div>`)
      .join('')
    expect(() => extractHuggingFaceBalance(html)).toThrow(/missing or ambiguous/i)
  })

  it('requests billing through the injected provider browser session', async () => {
    const fetch = vi.fn(async () => new Response(
      '<div data-props="{&quot;entity&quot;:{&quot;invoiceCreditsCents&quot;:725}}" data-target="BillingOverviewMetronome"></div>',
      { status: 200 }
    ))
    const result = await new HuggingFaceSessionCollector({ fetch }).balance()

    expect(result).toEqual({ provider: 'huggingface', balance_usd: 7.25 })
    expect(fetch).toHaveBeenCalledWith('https://huggingface.co/settings/billing', {
      headers: { Accept: 'text/html' }
    })
  })

  it('reports a signed-out session without exposing response contents', async () => {
    const collector = new HuggingFaceSessionCollector({
      fetch: vi.fn(async () => new Response('secret response', { status: 401 }))
    })
    await expect(collector.balance()).rejects.toThrow('Hugging Face browser session is signed out.')
  })
})
