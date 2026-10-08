import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

export interface SettingsSelectOption {
  value: string | number
  label: string
}

interface SettingsSelectProps {
  label: string
  value: string | number
  options: SettingsSelectOption[]
  placeholder?: string
  stacked?: boolean
  onChange: (value: string) => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-overlay-blue'

export function SettingsSelect({ label, value, options, placeholder, stacked = false, onChange }: SettingsSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => String(option.value) === String(value))

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div
      className={`settings-control grid items-center border-overlay-track ${stacked
        ? 'min-h-0 grid-cols-1 gap-1.5 border-b-0'
        : 'min-h-14 grid-cols-[minmax(0,1fr)_210px] gap-4 border-b max-[620px]:grid-cols-[minmax(0,1fr)_150px]'}`}
      ref={containerRef}
    >
      <span className={stacked ? 'text-[11.5px] text-overlay-muted' : 'text-[13.5px] text-overlay-text'}>{label}</span>
      <div className={`settings-select relative min-w-0${open ? ' settings-select--open' : ''}`}>
        <button
          className={`settings-select__trigger flex h-[34px] w-full min-w-0 cursor-pointer items-center justify-between rounded-md border border-overlay-track bg-overlay-elevated px-3 pr-2.5 text-left font-[inherit] text-[13px] text-overlay-strong transition-[background-color,border-color] duration-[120ms] hover:border-overlay-muted hover:bg-overlay-hover ${open ? 'border-overlay-muted bg-overlay-hover' : ''} ${focusRing}`}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={`truncate ${selected ? '' : 'text-overlay-muted'}`}>{selected?.label ?? placeholder ?? ''}</span>
          <FontAwesomeIcon className={`settings-select__chevron ml-2 size-2.5 shrink-0 text-overlay-muted transition-transform duration-[140ms] ${open ? 'rotate-180' : ''}`} icon={faChevronDown} aria-hidden="true" />
        </button>
        {open && (
          <div
            className="settings-select__menu absolute top-[calc(100%+4px)] right-0 left-0 z-30 max-h-[260px] overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-overlay-track bg-overlay-elevated p-1 shadow-none [animation:select-menu-in_120ms_ease-out_both] [scrollbar-color:var(--color-overlay-track)_transparent] [scrollbar-width:thin] [.overlay-root--shadows-enabled_&]:shadow-[0_10px_24px_color-mix(in_srgb,var(--color-overlay-shadow)_var(--shadow-opacity),transparent)]"
            role="listbox"
            aria-label={label}
          >
            {options.map((option) => {
              const isSelected = String(option.value) === String(value)
              return (
                <button
                  className={`settings-select__option block w-full cursor-pointer rounded-[5px] px-2.5 py-2 text-left font-[inherit] text-[13px] ${isSelected ? 'settings-select__option--selected bg-overlay-blue text-(--color-settings-accent-foreground)' : 'text-overlay-text hover:bg-overlay-hover hover:text-overlay-strong'} ${focusRing}`}
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(String(option.value))
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
