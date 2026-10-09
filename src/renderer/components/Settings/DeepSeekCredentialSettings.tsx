import { useState } from 'react'
import type { DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import { CREDENTIAL_SOURCES, type CredentialSource, type ProviderSetting } from '@shared/settings'
import { SettingsSelect } from './SettingsSelect'

const CREDENTIAL_SOURCE_LABELS: Record<CredentialSource, string> = {
  auto: 'Automatic',
  'harness-account': 'Harness account',
  'api-key': 'API key'
}

const ACTIVE_SOURCE_LABELS = {
  'harness-account': 'Harness account',
  'api-key': 'API key'
} as const

interface DeepSeekCredentialSettingsProps {
  provider: ProviderSetting
  providerView?: ProviderView
  status: DeepSeekCredentialStatus
  onCredentialSourceChange(source: CredentialSource): void
  onSaveApiKey(apiKey: string): Promise<void>
  onClearApiKey(): Promise<void>
}

function availabilityLabel(available: boolean, positive: string, negative: string): React.JSX.Element {
  return (
    <span className={available ? 'text-overlay-strong' : 'text-overlay-muted'}>
      {available ? positive : negative}
    </span>
  )
}

export function DeepSeekCredentialSettings({
  provider,
  providerView,
  status,
  onCredentialSourceChange,
  onSaveApiKey,
  onClearApiKey
}: DeepSeekCredentialSettingsProps): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState<'save' | 'clear'>()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>()

  const credentialSource = provider.credentialSource ?? 'auto'
  const authenticated = providerView?.snapshot.status === 'connected'
  const activeSource = authenticated ? providerView?.snapshot.authSource : undefined

  const save = async (): Promise<void> => {
    if (apiKey.trim().length === 0) return
    setBusy('save')
    setMessage(undefined)
    try {
      await onSaveApiKey(apiKey)
      setApiKey('')
      setMessage({ tone: 'success', text: 'API key saved.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not save the API key.'
      })
    } finally {
      setBusy(undefined)
    }
  }

  const clear = async (): Promise<void> => {
    setBusy('clear')
    setMessage(undefined)
    try {
      await onClearApiKey()
      setApiKey('')
      setMessage({ tone: 'success', text: 'Saved API key removed.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not remove the saved API key.'
      })
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="grid gap-3 border-b border-overlay-track py-4" data-testid="deepseek-credentials">
      <div className="grid gap-[3px]">
        <h3 className="m-0 text-[13.5px] font-medium text-overlay-strong">DeepSeek credentials</h3>
        <p className="m-0 text-[12px] leading-[1.45] text-overlay-muted">
          Automatic prefers the Harness account and falls back to a saved API key. Fixed modes never fall back.
        </p>
      </div>

      <SettingsSelect
        label="DeepSeek credential source"
        value={credentialSource}
        options={CREDENTIAL_SOURCES.map((source) => ({ value: source, label: CREDENTIAL_SOURCE_LABELS[source] }))}
        onChange={(value) => onCredentialSourceChange(value as CredentialSource)}
      />

      <dl className="m-0 grid gap-1 text-[12.5px] text-overlay-text">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-overlay-muted">Harness account</dt>
          <dd className="m-0">{availabilityLabel(status.harnessAccountAvailable, 'Detected', 'Not found')}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-overlay-muted">Saved API key</dt>
          <dd className="m-0">{availabilityLabel(status.storedApiKeyConfigured, 'Saved', 'Not saved')}</dd>
        </div>
        {status.environmentApiKeyAvailable && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-overlay-muted">DEEPSEEK_API_KEY</dt>
            <dd className="m-0 text-overlay-strong">Available</dd>
          </div>
        )}
        {activeSource && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-overlay-muted">Active source</dt>
            <dd className="m-0 text-overlay-strong" data-testid="deepseek-active-source">
              {ACTIVE_SOURCE_LABELS[activeSource]}
            </dd>
          </div>
        )}
      </dl>

      <div className="grid gap-1.5">
        <label className="text-[12.5px] text-overlay-muted" htmlFor="deepseek-api-key">DeepSeek API key</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="deepseek-api-key"
            className="h-[34px] min-w-0 flex-1 rounded-md border border-overlay-track bg-overlay-elevated px-3 font-[inherit] text-[13px] text-overlay-strong transition-[background-color,border-color] duration-[120ms] hover:border-overlay-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-overlay-blue"
            type="password"
            value={apiKey}
            autoComplete="off"
            spellCheck={false}
            disabled={busy !== undefined}
            placeholder="Paste a DeepSeek API key"
            onChange={(event) => setApiKey(event.target.value)}
          />
          <button
            className="flex h-[34px] cursor-pointer items-center justify-center rounded-md border border-overlay-track bg-overlay-elevated px-3 font-[inherit] text-[13px] text-overlay-strong transition-[background-color,border-color,opacity] duration-[120ms] hover:border-overlay-muted hover:bg-overlay-hover disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={busy !== undefined || apiKey.trim().length === 0}
            onClick={() => void save()}
          >
            {busy === 'save' ? 'Saving…' : 'Save API key'}
          </button>
          <button
            className="flex h-[34px] cursor-pointer items-center justify-center rounded-md border border-overlay-track bg-transparent px-3 font-[inherit] text-[13px] text-overlay-muted transition-[background-color,border-color,opacity] duration-[120ms] hover:border-overlay-muted hover:bg-overlay-hover hover:text-overlay-strong disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={busy !== undefined || !status.storedApiKeyConfigured}
            onClick={() => void clear()}
          >
            {busy === 'clear' ? 'Removing…' : 'Remove saved key'}
          </button>
        </div>
        <small
          className={`min-h-[14px] text-[11.5px] leading-[1.35] ${message?.tone === 'error' ? 'text-overlay-danger' : 'text-overlay-muted'}`}
          role="status"
          aria-live="polite"
        >
          {message?.text ?? 'The key is encrypted in the local analytics database and never shown again.'}
        </small>
      </div>
    </div>
  )
}
