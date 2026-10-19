import appIcon from '../../../resources/widoken.png'

interface WidokenWindowTitleBarProps {
  closeLabel: string
  minimizeLabel: string
  onClose: () => void
  onMinimize: () => void
}

export function WidokenWindowTitleBar({
  closeLabel,
  minimizeLabel,
  onClose,
  onMinimize
}: WidokenWindowTitleBarProps): React.JSX.Element {
  return (
    <header
      className="settings-panel__header relative z-[4] flex h-[50px] min-h-[50px] flex-[0_0_50px] items-center justify-between border-b border-overlay-track bg-overlay-thumb pr-2.5 pl-4 [-webkit-app-region:drag]"
      role="banner"
      aria-label="Widoken window"
    >
      <div className="flex items-center gap-2.5">
        <span className="settings-panel__mark grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border-0 bg-transparent" aria-hidden="true">
          <img className="settings-panel__app-icon block size-8 object-contain" src={appIcon} alt="" />
        </span>
        <strong className="text-sm font-semibold text-overlay-strong">Widoken</strong>
      </div>
      <div className="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
        <button
          className="grid size-8 cursor-pointer place-items-center rounded-md border-0 text-lg leading-none text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-overlay-hover hover:text-overlay-strong"
          type="button"
          onClick={onMinimize}
          aria-label={minimizeLabel}
        >
          −
        </button>
        <button
          className="grid size-8 cursor-pointer place-items-center rounded-md border-0 text-lg leading-none text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-[color-mix(in_srgb,var(--color-overlay-danger)_22%,transparent)] hover:text-overlay-strong"
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
        >
          ×
        </button>
      </div>
    </header>
  )
}
