import appIcon from '../../../../resources/widoken.png'

export function BoardAppButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button className="board-app" type="button" aria-label="Open settings" onClick={onClick}>
      <img className="board-app__logo" src={appIcon} alt="" draggable={false} />
    </button>
  )
}
