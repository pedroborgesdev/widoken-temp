import { useEffect, useState } from 'react'
import { browserSessionWelcomeFromSearch } from '@shared/browserSession'
import type { BrowserSessionConnectedStatus } from '@shared/ipc'
import { WidokenWindowTitleBar } from '../components/WidokenWindowTitleBar'
import { providerLogos } from '../utils/providerBranding'
import { syncedThemeStyle } from '../utils/theme'

function closeWindow(): void {
  if (window.browserSessionDesktop) void window.browserSessionDesktop.window.close()
  else window.close()
}

function minimizeWindow(): void {
  if (window.browserSessionDesktop) void window.browserSessionDesktop.window.minimize()
}

export function BrowserSessionWelcomeApp(): React.JSX.Element {
  const content = browserSessionWelcomeFromSearch(window.location.search)
  const [connected, setConnected] = useState<BrowserSessionConnectedStatus>()
  const [secondsRemaining, setSecondsRemaining] = useState(15)

  useEffect(() => window.browserSessionDesktop?.window.onConnected((status) => {
    setConnected(status)
    setSecondsRemaining(15)
  }), [])

  useEffect(() => {
    if (!connected) return
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [connected])

  if (!content) {
    return (
      <main className="overlay-root--theme-monokai-black flex size-full flex-col bg-overlay-surface font-['Segoe_UI_Variable_Text','Segoe_UI',system-ui,sans-serif] text-overlay-text antialiased">
        <WidokenWindowTitleBar closeLabel="Close sign-in" minimizeLabel="Minimize sign-in" onClose={closeWindow} onMinimize={minimizeWindow} />
        <section className="m-auto w-full max-w-md p-8 text-center">
          <h1 className="m-0 text-lg font-semibold text-overlay-strong">Unable to start sign-in</h1>
          <p className="mt-2 mb-0 text-sm leading-6 text-overlay-muted">The provider sign-in details were invalid. Close this window and try again.</p>
        </section>
      </main>
    )
  }

  const providerLogo = providerLogos[content.providerId]
  const loginHost = new URL(content.loginUrl).hostname

  return (
    <main
      className={`overlay-root--theme-${content.theme} flex size-full flex-col overflow-hidden bg-overlay-surface font-['Segoe_UI_Variable_Text','Segoe_UI',system-ui,sans-serif] text-overlay-text antialiased [&_button]:[-webkit-app-region:no-drag]`}
      style={syncedThemeStyle(content.syncedTheme)}
    >
      <WidokenWindowTitleBar closeLabel="Close sign-in" minimizeLabel="Minimize sign-in" onClose={closeWindow} onMinimize={minimizeWindow} />

      <section className="min-h-0 flex-1 overflow-y-auto px-8 py-7 max-[620px]:px-5 max-[620px]:py-6">
        {connected ? (
          <div className="mx-auto grid min-h-full w-full max-w-[520px] content-center justify-items-center gap-5 text-center" role="status" aria-live="polite">
            <span className="relative grid size-20 place-items-center" aria-hidden="true">
              {providerLogo
                ? <img className="size-14 object-contain" src={providerLogo} alt="" />
                : <strong className="text-3xl text-overlay-strong">{content.displayName.slice(0, 1)}</strong>}
              <span className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border-2 border-overlay-surface bg-overlay-success text-sm font-bold text-overlay-surface">✓</span>
            </span>

            <div className="grid gap-2">
              <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-overlay-strong">Session collected</h1>
              <p className="m-0 text-[13px] leading-5 text-overlay-text">
                Your {connected.displayName} session is ready to use in Widoken.
              </p>
              {connected.accountLabel && <p className="m-0 text-[11.5px] text-overlay-muted">Connected as {connected.accountLabel}</p>}
            </div>

            <button
              className="flex h-10 min-w-48 cursor-pointer items-center justify-center rounded-lg border-0 bg-overlay-blue px-6 text-[13px] font-semibold text-overlay-on-accent transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-overlay-blue"
              type="button"
              onClick={closeWindow}
            >
              Back to Widoken
            </button>

            <p className="m-0 text-[11.5px] text-overlay-muted">
              This window will close automatically in <strong className="font-semibold text-overlay-text">{secondsRemaining}s</strong>.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid min-h-full w-full max-w-[520px] content-center justify-items-center gap-5 text-center">
            <span className="grid size-16 place-items-center" aria-hidden="true">
              {providerLogo
                ? <img className="size-14 object-contain" src={providerLogo} alt="" />
                : <strong className="text-3xl text-overlay-strong">{content.displayName.slice(0, 1)}</strong>}
            </span>

            <div className="grid gap-2">
              <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-overlay-strong max-[620px]:text-xl">
                Sign in to your {content.displayName} account
              </h1>
              <p className="m-0 text-[13px] leading-5 text-overlay-text">{content.reason}</p>
            </div>

            <section className="w-full border-y border-overlay-track py-4 text-left" aria-labelledby="collected-data-heading">
              <h2 id="collected-data-heading" className="m-0 text-[12px] font-semibold text-overlay-strong">Widoken will only read</h2>
              <ul className="mt-2.5 mb-0 grid gap-1.5 pl-5 text-[12px] leading-[1.5] text-overlay-text marker:text-overlay-success">
                {content.collectedData.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>

            <p className="m-0 text-[11.5px] leading-[1.55] text-overlay-muted">
              Your password, prompts, responses, and cookies from other browsers are never read. This session is isolated to {content.displayName}.
            </p>

            <div className="grid justify-items-center gap-2.5">
              <a
                className="flex h-10 min-w-44 items-center justify-center rounded-lg bg-overlay-blue px-6 text-[13px] font-semibold text-overlay-on-accent no-underline transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-overlay-blue"
                href={content.loginUrl}
              >
                Sign in
              </a>
              <p className="m-0 text-[10.5px] leading-[1.4] text-overlay-muted">
                Opens the secure sign-in page at {loginHost}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
