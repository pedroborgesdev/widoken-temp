import gearIcon from '../../assets/ui/gear.png'

export function GearButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button className="gear-button" type="button" aria-label="Open settings" onClick={onClick}>
      <img src={gearIcon} alt="" draggable={false} />
    </button>
  )
}
