import { RotateCcw, Rotate3D } from 'lucide-react'
import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Projection } from './BrainScene'
import type { SceneState } from './brainModel'
import type { PartId } from './parts'
import { Pins } from './Pins'
import { partVisible, type CameraRequest, type Hover, type Preset, type View } from './state'

type ViewportProps = SceneState & {
  preset: Preset
  camera: CameraRequest | null
  transport: ReactNode
  onSelect: (part: PartId | null) => void
  onHover: (part: PartId | null) => void
  onStopRotation: () => void
  onView: (view: View) => void
  onPreset: (preset: Preset) => void
  onReset: () => void
  onToggleRotate: () => void
}

const BrainScene = lazy(() => import('./BrainScene'))
const VIEWS: { id: View; label: string }[] = [{ id: 'circuit', label: 'Circuit' }, { id: 'anatomy', label: 'Anatomy' }]
const PRESETS: { id: Preset; label: string }[] = [{ id: 'top', label: 'Top' }, { id: 'side', label: 'Side' }, { id: 'front', label: 'Front' }]

function Fallback({ view }: { view: View }) {
  return (
    <svg className="brain-fallback" viewBox="0 0 380 250" role="img" aria-label="Simplified two-dimensional view of both hemispheres and the thalamocortical circuit">
      {[-1, 1].map((side) => (
        <g key={side} transform={side === 1 ? 'translate(380 0) scale(-1 1)' : undefined}>
          <path className="diagram-cortex" d="M179 44C156 19 121 21 102 37 80 34 60 48 54 68 34 75 25 96 29 115 15 138 28 163 46 171 48 195 76 213 100 207 123 226 159 215 176 194 187 179 186 63 179 44Z" />
          <path className="diagram-folds" d="M164 49Q129 42 115 67T80 83T51 115M159 69Q139 69 129 94T97 113T62 144M169 99Q151 98 146 130T117 156T90 180M70 68Q85 56 102 60M40 128Q51 121 62 127M57 172Q73 180 83 168M103 190Q135 192 163 166" />
          {view !== 'anatomy' && (
            <>
              <path className="diagram-path" d="M168 133Q146 124 129 94M168 133Q131 140 91 150M168 133Q164 157 139 177" />
              <ellipse className="diagram-thalamus" cx="168" cy="133" rx="11" ry="16" />
            </>
          )}
        </g>
      ))}
    </svg>
  )
}

export function BrainViewport({
  preset, camera, transport, onSelect, onHover, onStopRotation,
  onView, onPreset, onReset, onToggleRotate, ...sceneState
}: ViewportProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [projection, setProjection] = useState<Projection>({ pins: [], orientation: [] })
  const [hover, setHover] = useState<Hover>(null)

  const rayHover = useCallback((item: Hover) => {
    setHover(item)
    onHover(item?.id ?? null)
  }, [onHover])

  const callbacks = useMemo(() => ({
    onReady: () => setStatus('ready'),
    onUnavailable: () => setStatus('fallback'),
    onProject: setProjection,
    onHover: rayHover,
    onPick: onSelect,
    onStopRotation,
  }), [rayHover, onSelect, onStopRotation])

  const ready = status === 'ready'

  return (
    <section className="brain-stage" aria-label="Brain explorer" data-phase={sceneState.phase}>
      {!ready && <Fallback view={sceneState.view} />}
      {status !== 'fallback' && (
        <Suspense fallback={null}><BrainScene state={sceneState} command={camera} callbacks={callbacks} /></Suspense>
      )}
      {ready && (
        <>
          <Pins pins={projection.pins.filter(({ id }) => partVisible(id, sceneState.view))}
            hover={hover && partVisible(hover.id, sceneState.view) ? hover : null} hovered={sceneState.hovered} selected={sceneState.selected} onSelect={onSelect} onHover={onHover} />
          <div className="orientation glass" aria-hidden="true">
            <i />
            {projection.orientation.map(({ label, x, y }) => (
              <span key={label} style={{ translate: `${x}px ${y}px` }}>{label}</span>
            ))}
          </div>
        </>
      )}
      <div className="segments glass view-controls" role="group" aria-label="Brain view">
        {VIEWS.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={sceneState.view === id} onClick={() => onView(id)}>{label}</button>
        ))}
      </div>
      <div className="segments glass camera-controls" role="group" aria-label="Camera controls">
        {PRESETS.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={preset === id}
            title={`${label} view`} disabled={!ready} onClick={() => onPreset(id)}>{label}</button>
        ))}
        <button type="button" className="icon-button" aria-label="Auto-rotate" title="Auto-rotate" aria-pressed={sceneState.autoRotate}
          disabled={!ready} onClick={onToggleRotate}><Rotate3D size={17} aria-hidden="true" /></button>
        <button type="button" className="icon-button" aria-label="Reset camera" title="Reset camera" disabled={!ready} onClick={onReset}><RotateCcw size={16} aria-hidden="true" /></button>
      </div>
      <p className={ready ? 'stage-hint' : 'stage-hint stage-status'} aria-live="polite">
        {ready ? 'Drag to rotate · Scroll to zoom · Click a part' : status === 'loading' ? 'Loading 3D anatomy…' : '2D schematic · 3D unavailable'}
      </p>
      {transport}
    </section>
  )
}
