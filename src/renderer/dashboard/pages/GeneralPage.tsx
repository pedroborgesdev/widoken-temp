import { useState } from 'react'
import type { AppSettings, SettingsPatch } from '@shared/settings'
import { SettingsCheckbox, SettingsSection } from '../../components/Settings/SettingsControls'
import { SettingsSelect } from '../../components/Settings/SettingsSelect'

interface GeneralPageProps {
  settings: AppSettings
  onUpdate: (patch: SettingsPatch) => void
  onReset: () => Promise<AppSettings>
}

const resetButtonClass =
  'flex h-[32px] cursor-pointer items-center justify-center rounded-md border border-overlay-track bg-overlay-elevated px-3 font-[inherit] text-[12px] font-medium text-overlay-strong transition-[background-color,border-color,opacity] duration-[120ms] hover:border-overlay-muted hover:bg-overlay-hover disabled:cursor-not-allowed disabled:opacity-50'
const cancelButtonClass =
  'flex h-[32px] cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-2 font-[inherit] text-[12px] text-overlay-muted transition-[background-color,border-color,opacity] duration-[120ms] hover:bg-overlay-hover hover:text-overlay-strong disabled:cursor-not-allowed disabled:opacity-50'

export function GeneralPage({ settings, onUpdate, onReset }: GeneralPageProps): React.JSX.Element {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | undefined>(undefined)

  const reset = async (): Promise<void> => {
    setResetting(true)
    try {
      await onReset()
      setResetMessage('Defaults restored.')
      setConfirmingReset(false)
    } catch {
      setResetMessage('Could not reset the settings.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <SettingsSection title="General" description="Settings for the whole app.">
      <div className="grid gap-[22px]">
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Interface</h3>
          <div className="grid border-t border-overlay-track">
            <SettingsCheckbox
              checked={settings.dashboardFollowsWidgetTheme}
              label="Use the widget theme for the whole interface"
              onChange={(dashboardFollowsWidgetTheme) => onUpdate({ dashboardFollowsWidgetTheme })}
            />
          </div>
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Startup</h3>
          <div className="grid border-t border-overlay-track">
            <SettingsCheckbox
              checked={settings.launchAtStartup}
              label="Launch Widget at startup"
              onChange={(launchAtStartup) => onUpdate({ launchAtStartup })}
            />
          </div>
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Data</h3>
          <div className="grid border-t border-overlay-track">
            <SettingsSelect
              label="Refresh interval"
              value={settings.refreshIntervalSeconds}
              options={[{ value: 30, label: '30 seconds' }, { value: 45, label: '45 seconds' }, { value: 60, label: '1 minute' }, { value: 300, label: '5 minutes' }]}
              onChange={(value) => onUpdate({ refreshIntervalSeconds: Number(value) })}
            />
          </div>
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Reset</h3>
          <div className="grid border-t border-overlay-track">
            <div className="settings-reset flex min-h-14 flex-wrap items-center gap-3 border-b border-overlay-track py-2">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <strong className="text-[13.5px] font-medium text-overlay-strong">Reset to defaults</strong>
                <small className="text-[12.5px] leading-[1.4] text-overlay-muted">
                  Restore every app, widget, and provider setting. Saved credentials are kept.
                </small>
              </span>
              {confirmingReset ? (
                <span className="flex flex-wrap items-center gap-2">
                  <button className={resetButtonClass} type="button" disabled={resetting} onClick={() => void reset()}>
                    {resetting ? 'Resetting…' : 'Reset everything'}
                  </button>
                  <button
                    className={cancelButtonClass}
                    type="button"
                    disabled={resetting}
                    onClick={() => setConfirmingReset(false)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  className={resetButtonClass}
                  type="button"
                  onClick={() => {
                    setResetMessage(undefined)
                    setConfirmingReset(true)
                  }}
                >
                  Reset to defaults
                </button>
              )}
            </div>
            <small className="settings-reset__status min-h-[14px] pt-2 text-[11px] leading-[1.4] text-overlay-muted" role="status" aria-live="polite">
              {resetMessage}
            </small>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
