import type { ReactNode } from 'react'

export function SettingsSection({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="settings-panel__section">
      <div className="settings-panel__section-heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-panel__section-content">{children}</div>
    </section>
  )
}

export function SettingsRange({
  label,
  value,
  minimum,
  maximum,
  step = 1,
  suffix = '',
  onChange
}: {
  label: string
  value: number
  minimum: number
  maximum: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="settings-range">
      <span className="settings-range__label">{label}</span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{Math.round(value)}{suffix}</output>
    </label>
  )
}

export function SettingsCheckbox({
  checked,
  label,
  onChange
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="settings-check settings-check--standalone">
      <span>{label}</span>
      <span className="settings-switch">
        <input
          className="settings-switch__input"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </span>
    </label>
  )
}
