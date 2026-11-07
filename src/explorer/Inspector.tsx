import { Brain, Check, ChevronRight, CircleDotDashed, GitFork, Link2, Orbit, X } from 'lucide-react'
import { useId } from 'react'
import { getPart, PARTS, type PartId } from './parts'
import { PHASES, type Phase } from './phases'

type PartListProps = {
  selected: PartId | null
  onSelect: (id: PartId) => void
  onHover: (id: PartId | null) => void
}

type InspectorProps = PartListProps & {
  phase: Phase
  onClear: () => void
}

const PART_ICONS = {
  thalamus: Link2,
  cortex: Brain,
  pathways: GitFork,
  electrodes: CircleDotDashed,
  hindbrain: Orbit,
}

export function PhaseDetails({ phase }: { phase: Phase }) {
  const item = PHASES[phase]

  return (
    <div className="phase-details">
      <h2>{item.title}</h2>
      <h3>On the EEG</h3>
      <p>{item.eeg}</p>
      <h3>In the model</h3>
      <p>{item.brain}</p>
    </div>
  )
}

export function PartDetails({ selected, phase, onClear }: InspectorProps) {
  if (!selected) return <PhaseDetails phase={phase} />

  const part = getPart(selected)

  return (
    <div className="part-details">
      <div className="part-heading">
        <h2><i style={{ background: part.swatch }} />{part.name}</h2>
        <button className="icon-button" aria-label="Clear selection" title="Clear selection" onClick={onClear}><X size={17} aria-hidden="true" /></button>
      </div>
      <p className="part-kind">{part.kind}</p>
      <p>{part.about}</p>
      <p className="part-now">{part.now[phase]}</p>
    </div>
  )
}

export function PartList({ selected, onSelect, onHover }: PartListProps) {
  const listId = useId()

  return (
    <section className="parts-list" aria-label="Parts">
      <ul>
        {PARTS.map((part) => {
          const Icon = PART_ICONS[part.id]
          const active = selected === part.id
          const descriptionId = `${listId}-${part.id}`

          return (
            <li key={part.id}>
              <button type="button" aria-pressed={active} aria-label={part.name} aria-describedby={descriptionId}
                onClick={() => onSelect(part.id)}
                onPointerEnter={() => onHover(part.id)} onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(part.id)} onBlur={() => onHover(null)}
              >
                <span className="part-card-icon" style={{ color: part.swatch }}><Icon size={19} aria-hidden="true" /></span>
                <span className="part-card-copy">
                  <strong>{part.name}</strong>
                  <small id={descriptionId}>{part.kind}</small>
                </span>
                <span className="part-short-name">{part.shortName}</span>
                <span className="part-card-state" aria-hidden="true">
                  {active ? <Check size={14} strokeWidth={2.8} /> : <ChevronRight size={16} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Inspector(props: InspectorProps) {
  return (
    <aside className="inspector" aria-label="Inspector">
      <PartDetails {...props} />
      <PartList {...props} />
    </aside>
  )
}
