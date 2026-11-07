import { getPart, type PartId } from './parts'
import type { Hover, Pin } from './state'

type PinsProps = {
  pins: Pin[]
  hover: Hover
  hovered: PartId | null
  selected: PartId | null
  onSelect: (id: PartId) => void
  onHover: (id: PartId | null) => void
}

export function Pins({ pins, hover, hovered, selected, onSelect, onHover }: PinsProps) {
  return (
    <div className="pins">
      {pins.map(({ id, x, y }) => {
        const part = getPart(id)

        return (
          <button key={id} type="button" className="part-pin"
            aria-label={`Inspect ${part.name}`} aria-pressed={selected === id} data-highlighted={hovered === id}
            title={part.name} style={{ left: x, top: y }}
            onClick={() => onSelect(id)}
            onPointerEnter={() => onHover(id)} onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(id)} onBlur={() => onHover(null)}
          ><span /></button>
        )
      })}
      {hover && (
        <span className="part-tooltip" aria-hidden="true"
          style={{ left: `min(${hover.x + 22}px, calc(100% - 192px))`, top: hover.y }}
        >{getPart(hover.id).shortName} <span>· Click for details</span></span>
      )}
    </div>
  )
}
