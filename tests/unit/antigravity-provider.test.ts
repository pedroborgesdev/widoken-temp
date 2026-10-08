import { afterEach, describe, expect, it, vi } from 'vitest'
import { AntigravityProviderAdapter, parseAntigravityUsage } from '../../src/main/providers/AntigravityProviderAdapter'

afterEach(() => {
  delete process.env.ANTIGRAVITY_LS_ADDRESS
  delete process.env.ANTIGRAVITY_CSRF_TOKEN
  vi.restoreAllMocks()
})

describe('Antigravity usage pools', () => {
  it('reads usage from the authenticated local language server', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      userStatus: {
        planStatus: { planInfo: { planName: 'Pro' } },
        cascadeModelConfigData: {
          clientModelConfigs: [{
            label: 'Gemini 3.1 Pro',
            quotaInfo: { remainingFraction: 0.8, resetTime: '2026-10-15T16:00:00Z' }
          }]
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    process.env.ANTIGRAVITY_LS_ADDRESS = '127.0.0.1:61234'
    process.env.ANTIGRAVITY_CSRF_TOKEN = 'test-token-12345678'

    const snapshot = await new AntigravityProviderAdapter().getUsage()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:61234/exa.language_server_pb.LanguageServerService/GetUserStatus',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-codeium-csrf-token': 'test-token-12345678' })
      })
    )
    expect(snapshot).toMatchObject({
      providerId: 'antigravity',
      status: 'connected',
      plan: 'Pro',
      limits: [{ id: 'models', percent: 20 }]
    })
  })

  it('parses separate Gemini and Partner model pools with percentages and resets', () => {
    const limits = parseAntigravityUsage({
      userStatus: {
        cascadeModelConfigData: {
          clientModelConfigs: [
            {
              label: 'Gemini 3.1 Pro (High)',
              quotaInfo: {
                remainingFraction: 0.85,
                resetTime: '2026-10-15T16:00:00Z'
              }
            },
            {
              label: 'Gemini 3.8 Flash (High)',
              quotaInfo: {
                remainingFraction: 0.85,
                resetTime: '2026-10-15T16:00:00Z'
              }
            },
            {
              label: 'Claude Sonnet 4.6 (Thinking)',
              quotaInfo: {
                remainingFraction: 0.75,
                resetTime: '2026-10-15T17:00:00Z'
              }
            },
            {
              label: 'GPT-OSS 120B (Medium)',
              quotaInfo: {
                remainingFraction: 0.75,
                resetTime: '2026-10-15T17:00:00Z'
              }
            }
          ]
        }
      }
    })

    expect(limits).toEqual([
      {
        id: 'gemini',
        label: 'Gemini models',
        percent: 15,
        resetsAt: '2026-10-15T16:00:00.000Z'
      },
      {
        id: 'partner',
        label: 'Partner models',
        percent: 25,
        resetsAt: '2026-10-15T17:00:00.000Z'
      }
    ])
  })

  it('includes prompt and flow credits when plan information is provided', () => {
    const limits = parseAntigravityUsage({
      userStatus: {
        planStatus: {
          planInfo: {
            planName: 'Pro',
            monthlyPromptCredits: 50000,
            monthlyFlowCredits: 100000
          },
          availablePromptCredits: 40000,
          availableFlowCredits: 25000
        },
        cascadeModelConfigData: {
          clientModelConfigs: [
            {
              label: 'Gemini 3.1 Pro (High)',
              quotaInfo: {
                remainingFraction: 0.90
              }
            }
          ]
        }
      }
    })

    expect(limits).toEqual([
      {
        id: 'models',
        label: 'All models',
        percent: 10,
        resetsAt: undefined
      },
      {
        id: 'prompt-credits',
        label: 'Prompt credits',
        percent: 20,
        used: 10000,
        limit: 50000,
        remaining: 40000
      },
      {
        id: 'flow-credits',
        label: 'Flow credits',
        percent: 75,
        used: 75000,
        limit: 100000,
        remaining: 25000
      }
    ])
  })

  it('handles empty or missing model configurations safely', () => {
    expect(parseAntigravityUsage({})).toEqual([])
    expect(parseAntigravityUsage({ userStatus: {} })).toEqual([])
  })
})
