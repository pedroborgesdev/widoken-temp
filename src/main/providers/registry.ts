import { MockProviderAdapter } from './mock/MockProviderAdapter'
import { CursorProviderAdapter } from './CursorProviderAdapter'
import { CodexProviderAdapter } from './CodexProviderAdapter'
import { ClaudeProviderAdapter } from './ClaudeProviderAdapter'
import { GitHubCopilotProviderAdapter } from './GitHubCopilotProviderAdapter'
import type { ProviderAdapter } from './ProviderAdapter'

const inMinutes = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString()
const inDays = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString()

function createTestRegistry(): Map<string, ProviderAdapter> {
  const adapters: ProviderAdapter[] = [
    new MockProviderAdapter({
      id: 'claude',
      name: 'Claude',
      limits: [
        { id: 'five-hour', label: '5 hours rate limit', percent: 23, resetsAt: inMinutes(123) },
        { id: 'week', label: 'Week rate limit', percent: 31, resetsAt: inDays(3) }
      ]
    }),
    new MockProviderAdapter({
      id: 'openai',
      name: 'ChatGPT',
      plan: 'plus',
      limits: [
        { id: 'primary', label: 'Primary window', percent: 55, resetsAt: inMinutes(86) },
        { id: 'secondary', label: 'Secondary window', percent: 42, resetsAt: inDays(4) }
      ]
    }),
    new MockProviderAdapter({
      id: 'cursor',
      name: 'Cursor',
      plan: 'pro',
      limits: [{ id: 'monthly', label: 'Monthly fast requests', percent: 80, resetsAt: inDays(9), used: 16, limit: 20, remaining: 4 }]
    }),
    new MockProviderAdapter({
      id: 'antigravity',
      name: 'Antigravity',
      status: 'unavailable',
      error: 'Failed to get token usage. Connect at the provider and try again.'
    }),
    new MockProviderAdapter({
      id: 'copilot',
      name: 'GitHub Copilot',
      plan: 'individual',
      limits: [{ id: 'month', label: 'Monthly premium requests', percent: 18, resetsAt: inDays(12), used: 18, limit: 100, remaining: 82 }]
    })
  ]
  return new Map(adapters.map((adapter) => [adapter.id, adapter]))
}

export function createProviderRegistry(): Map<string, ProviderAdapter> {
  if (process.env.NODE_ENV === 'test') return createTestRegistry()

  const adapters: ProviderAdapter[] = [
    new ClaudeProviderAdapter(),
    new CodexProviderAdapter(),
    new CursorProviderAdapter(),
    new GitHubCopilotProviderAdapter(),
    new MockProviderAdapter({
      id: 'antigravity',
      name: 'Antigravity',
      status: 'unavailable',
      error: 'Failed to get token usage. Connect at the provider and try again.'
    })
  ]

  return new Map(adapters.map((adapter) => [adapter.id, adapter]))
}
