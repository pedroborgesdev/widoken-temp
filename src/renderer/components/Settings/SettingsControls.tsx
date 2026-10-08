import type { ReactNode } from 'react'

const focusRing = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-overlay-blue'

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
    <section className="settings-panel__section flex h-full min-h-0 w-full flex-col px-1">
      <div className="mb-3.5 shrink-0">
        <h2 className="m-0 text-xl font-semibold tracking-[-0.01em] text-overlay-strong">{title}</h2>
        {description && <p className="mt-1 mb-0 text-[13px] leading-[1.45] text-overlay-muted">{description}</p>}
      </div>
      <div className="settings-panel__section-content mr-[-4px] min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-2 [scrollbar-color:var(--color-overlay-track)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[7px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-overlay-track [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-thumb:hover]:bg-overlay-muted [&::-webkit-scrollbar-track]:bg-transparent">
        {children}
      </div>
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
    <label className="settings-range grid min-h-14 grid-cols-[minmax(0,1fr)_210px_48px] items-center gap-4 border-b border-overlay-track max-[620px]:grid-cols-[minmax(0,1fr)_150px]">
      <span className="text-[13.5px] text-overlay-text">{label}</span>
      <input
        className={`h-[18px] w-full cursor-pointer appearance-none bg-transparent accent-overlay-blue ${focusRing} [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-overlay-track [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-overlay-blue`}
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output className="text-right text-[13px] text-overlay-strong tabular-nums max-[620px]:hidden">{Math.round(value)}{suffix}</output>
    </label>
  )
}

export function SettingsToggle({
  checked,
  label,
  onChange
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <span className="settings-switch relative inline-flex h-5 w-[34px] shrink-0 cursor-pointer">
      <input
        className="settings-switch__input peer absolute inset-0 z-[1] m-0 size-full cursor-pointer opacity-0"
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-overlay-track bg-overlay-hover transition-[background-color,border-color] duration-[140ms] peer-checked:border-overlay-blue peer-checked:bg-overlay-blue peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-overlay-blue after:absolute after:top-[3px] after:left-[3px] after:size-3 after:rounded-full after:bg-overlay-muted after:transition-[background-color,transform] after:duration-[160ms] after:ease-[cubic-bezier(0.2,0.85,0.3,1.15)] after:content-[''] peer-checked:after:translate-x-[14px] peer-checked:after:bg-(--color-settings-accent-foreground)"
      />
    </span>
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
    <label className="settings-check settings-check--standalone flex min-h-14 cursor-pointer items-center justify-between gap-4 border-b border-overlay-track">
      <span className="text-[13.5px] text-overlay-text">{label}</span>
      <SettingsToggle checked={checked} label={label} onChange={onChange} />
    </label>
  )
}
