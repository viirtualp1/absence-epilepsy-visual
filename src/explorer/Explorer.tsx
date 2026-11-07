import { Activity } from 'lucide-react'
import { useCallback, useReducer, useSyncExternalStore, type KeyboardEvent } from 'react'
import { useSimulation } from '../hooks/useSimulation'
import { BrainViewport } from './BrainViewport'
import { Inspector, PartDetails, PartList, PhaseDetails } from './Inspector'
import type { PartId } from './parts'
import { PHASE_ORDER, PHASES } from './phases'
import { MobileTimeline, SignalTimeline } from './SignalTimeline'
import { Sources } from './Sources'
import { explorerReducer, INITIAL_STATE, type SheetTab } from './state'

const PHONE = '(max-width: 639px)'
const TABS: { id: SheetTab; label: string }[] = [{ id: 'part', label: 'Part' }, { id: 'eeg', label: 'EEG' }, { id: 'phase', label: 'Phase' }]

function subscribePhone(callback: () => void) {
  const query = window.matchMedia(PHONE)
  query.addEventListener('change', callback)

  return () => query.removeEventListener('change', callback)
}

function isPhone() {
  return window.matchMedia(PHONE).matches
}

export function Explorer() {
  const [state, dispatch] = useReducer(explorerReducer, INITIAL_STATE)
  const phone = useSyncExternalStore(subscribePhone, isPhone)
  const playback = useSimulation()
  const phase = PHASES[playback.phase]
  const onSelect = useCallback((id: PartId | null) => dispatch({ type: 'select', id }), [])
  const onHover = useCallback((id: PartId | null) => dispatch({ type: 'hover', id }), [])
  const stopRotation = useCallback(() => dispatch({ type: 'rotate', enabled: false }), [])

  function shortcuts(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (!(event.target instanceof Element) || event.target.closest('input, select, textarea, [contenteditable="true"]')) return
    if (event.key === ' ' && event.target.closest('button, a')) return

    switch (event.key) {
      case ' ': playback.togglePlayback(); break
      case 'ArrowLeft': playback.seek(playback.time - 0.5); break
      case 'ArrowRight': playback.seek(playback.time + 0.5); break
      case '1': case '2': case '3': playback.seek(PHASES[PHASE_ORDER[Number(event.key) - 1]].start); break
      default: return
    }

    event.preventDefault()
  }

  function changeTab(event: KeyboardEvent, index: number) {
    const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (!offset) return

    event.preventDefault()
    const tab = TABS[(index + offset + TABS.length) % TABS.length].id
    dispatch({ type: 'tab', tab })
    document.getElementById(`sheet-tab-${tab}`)?.focus()
  }

  const inspector = {
    phase: playback.phase, selected: state.selected,
    onSelect, onHover,
    onClear: () => onSelect(null),
  }
  const timeline = {
    playback, activeLead: state.activeLead ?? state.pickedLead,
    onHover: (lead: number | null) => dispatch({ type: 'hover-lead', lead }),
    onPick: (lead: number) => dispatch({ type: 'select', id: 'electrodes', lead }),
  }

  return (
    <>
      <a className="skip-link" href="#explorer">Skip to explorer</a>
      <header className="app-header">
        <h1><span className="brand-icon"><Activity size={16} aria-hidden="true" /></span> Absence Lab</h1>
        <div className="phase-chip" role="status" data-phase={playback.phase}>
          <i /><strong>{phase.label}</strong><span className="phase-chip-title">{phase.title}</span>
          <small className="phase-range">{phase.start}–{phase.end} s</small>
          <small className="phase-current" aria-hidden="true">{playback.time.toFixed(1)} s</small>
        </div>
        <Sources />
      </header>
      <main id="explorer" tabIndex={0} onKeyDown={shortcuts}>
        <div className="workbench">
          <BrainViewport
            time={playback.time} phase={playback.phase} view={state.view} preset={state.preset}
            camera={state.camera} selected={state.selected} hovered={state.hovered}
            lead={timeline.activeLead} autoRotate={state.autoRotate}
            onSelect={onSelect} onHover={onHover} onStopRotation={stopRotation}
            onView={(view) => dispatch({ type: 'view', view })}
            onPreset={(preset) => dispatch({ type: 'preset', preset })}
            onReset={() => dispatch({ type: 'reset' })}
            onToggleRotate={() => dispatch({ type: 'rotate', enabled: !state.autoRotate })}
            transport={phone && <MobileTimeline playback={playback} />}
          />
          {!phone && <Inspector {...inspector} />}
        </div>
        {phone ? (
          <section className="phone-sheet" aria-label="Recording details">
            <span className="sheet-handle" aria-hidden="true" />
            <div className="segments sheet-tabs" role="tablist" aria-label="Recording details">
              {TABS.map(({ id, label }, index) => (
                <button key={id} type="button" role="tab" id={`sheet-tab-${id}`} aria-controls={`sheet-panel-${id}`}
                  aria-selected={state.tab === id} tabIndex={state.tab === id ? 0 : -1}
                  onClick={() => dispatch({ type: 'tab', tab: id })} onKeyDown={(event) => changeTab(event, index)}
                >{label}</button>
              ))}
            </div>
            {TABS.map(({ id }) => (
              <div key={id} className="sheet-panel" role="tabpanel" id={`sheet-panel-${id}`}
                aria-labelledby={`sheet-tab-${id}`} hidden={state.tab !== id} tabIndex={0}>
                {state.tab === id && id === 'part' && <PartDetails {...inspector} />}
                {state.tab === id && id === 'eeg' && <SignalTimeline {...timeline} />}
                {state.tab === id && id === 'phase' && <PhaseDetails phase={playback.phase} />}
              </div>
            ))}
            <PartList {...inspector} />
          </section>
        ) : <SignalTimeline {...timeline} />}
      </main>
    </>
  )
}
