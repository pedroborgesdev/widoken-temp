export function UnavailablePopover({ message, style }: { message?: string, style?: React.CSSProperties }): React.JSX.Element {
  return (
    <div className="unavailable-popover" data-node-id="9:375" style={style}>
      <p className="usage-popover__label">Unavailable status</p>
      <p className="usage-popover__reset">
        {message ?? 'Failed to get token usage. Connect at the provider and try again.'}
      </p>
    </div>
  )
}
