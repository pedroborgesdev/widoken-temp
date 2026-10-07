import appIcon from '../../../../resources/widoken.png'

export function BoardAppButton({
  onClick,
  onEnter,
  onLeave
}: {
  onClick: () => void
  onEnter: () => void
  onLeave: () => void
}): React.JSX.Element {
  return (
    <button
      className="board-app"
      type="button"
      aria-label="Open Widoken Menu"
      onClick={onClick}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <img className="board-app__logo" src={appIcon} alt="" draggable={false} />
    </button>
  )
}
