export function UnavailablePopover({ message }: { message?: string }): React.JSX.Element {
  return (
    <div className="unavailable-popover" data-node-id="9:375">
      <p className="usage-popover__label">Unavailable status</p>
      <p className="usage-popover__reset">
        {message ?? 'Failed to get token usage. Connect at the provider and try again.'}
      </p>
    </div>
  )
}
