import appIcon from '../../../../resources/widoken.png'

export function BoardAppButton({
  turned,
  onClick,
  onEnter,
  onLeave
}: {
  turned: boolean
  onClick: () => void
  onEnter: () => void
  onLeave: () => void
}): React.JSX.Element {
  return (
    <button
      className={`board-app${turned ? ' board-app--turned' : ''}`}
      type="button"
      aria-label="Open Widoken Menu"
      onClick={onClick}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <img className="board-app__logo" src={appIcon} alt="" draggable={false} />
    </button>
  )
}
