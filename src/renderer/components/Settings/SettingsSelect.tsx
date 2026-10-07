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
  onChange: (value: string) => void
}

export function SettingsSelect({ label, value, options, placeholder, onChange }: SettingsSelectProps): React.JSX.Element {
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
    <div className="settings-control" ref={containerRef}>
      <span>{label}</span>
      <div className={`settings-select${open ? ' settings-select--open' : ''}`}>
        <button
          className="settings-select__trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={selected ? undefined : 'settings-select__placeholder'}>{selected?.label ?? placeholder ?? ''}</span>
          <FontAwesomeIcon className="settings-select__chevron" icon={faChevronDown} aria-hidden="true" />
        </button>
        {open && (
          <div className="settings-select__menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                className={`settings-select__option${String(option.value) === String(value) ? ' settings-select__option--selected' : ''}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={String(option.value) === String(value)}
                onClick={() => {
                  onChange(String(option.value))
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
