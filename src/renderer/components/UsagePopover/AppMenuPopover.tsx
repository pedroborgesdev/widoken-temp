export function AppMenuPopover({ style }: { style?: React.CSSProperties }): React.JSX.Element {
  return (
    <div className="unavailable-popover" style={style}>
      <p className="usage-popover__label">Open Widoken Menu</p>
      <p className="usage-popover__reset">Providers, appearance, and widget behavior.</p>
    </div>
  )
}
