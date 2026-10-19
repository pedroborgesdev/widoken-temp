import { useState } from 'react'
import type { BrowserSessionStatus } from '@shared/ipc'

interface BrowserSessionSettingsProps {
  providerName: string
  status?: BrowserSessionStatus
  onLogin(): Promise<void>
  onLogout(): Promise<void>
}

export function BrowserSessionSettings({
  providerName,
  status,
  onLogin,
  onLogout
}: BrowserSessionSettingsProps): React.JSX.Element {
  const [busy, setBusy] = useState<'login' | 'logout'>()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>()
  const authenticated = status?.authenticated === true

  const run = async (action: 'login' | 'logout'): Promise<void> => {
    setBusy(action)
    setMessage(undefined)
    try {
      if (action === 'login') await onLogin()
      else await onLogout()
      setMessage({
        tone: 'success',
        text: action === 'login' ? 'Browser session connected.' : 'Browser session removed.'
      })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : `Could not update the ${providerName} browser session.`
      })
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <section className="grid gap-4 rounded-xl border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_48%,var(--color-overlay-surface))] p-5 max-[620px]:p-4" data-testid="browser-session-settings">
      <div className="grid gap-1">
        <h4 className="m-0 text-[13.5px] font-medium text-overlay-strong">Private browser session</h4>
        <p className="m-0 text-[12px] leading-[1.45] text-overlay-muted">
          Widoken opens an isolated browser for {providerName}. Its cookies stay in the main process and are used only for that provider.
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border border-overlay-track bg-overlay-elevated/40 p-3.5">
        <dl className="m-0 grid gap-2 text-[12px] text-overlay-text">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-overlay-muted">Session</dt>
            <dd className={`m-0 font-medium ${authenticated ? 'text-overlay-success' : 'text-overlay-muted'}`}>
              {authenticated ? 'Connected' : 'Signed out'}
            </dd>
          </div>
          {status?.accountLabel && (
            <div className="flex items-center justify-between gap-4 border-t border-overlay-track pt-2">
              <dt className="text-overlay-muted">Account</dt>
              <dd className="m-0 font-medium text-overlay-strong">{status.accountLabel}</dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap items-center gap-2 border-t border-overlay-track pt-3">
          <button
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-md border border-overlay-track bg-overlay-elevated px-3 font-[inherit] text-[12px] font-medium text-overlay-strong transition-[background-color,border-color,opacity] duration-[120ms] hover:border-overlay-muted hover:bg-overlay-hover disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={busy !== undefined || authenticated}
            onClick={() => void run('login')}
          >
            {busy === 'login' ? 'Waiting for sign-in…' : `Sign in to ${providerName}`}
          </button>
          <button
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-2 font-[inherit] text-[12px] text-overlay-muted transition-[background-color,border-color,opacity] duration-[120ms] hover:bg-overlay-hover hover:text-overlay-strong disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={busy !== undefined || !authenticated}
            onClick={() => void run('logout')}
          >
            {busy === 'logout' ? 'Signing out…' : 'Remove session'}
          </button>
        </div>
        <small
          className={`min-h-[14px] text-[11px] leading-[1.4] ${message?.tone === 'error' || status?.error ? 'text-overlay-danger' : 'text-overlay-muted'}`}
          role="status"
          aria-live="polite"
        >
          {message?.text ?? status?.error ?? 'Cookies are managed by Electron and are never exposed to the dashboard.'}
        </small>
      </div>
    </section>
  )
}
