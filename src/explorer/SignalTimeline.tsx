import { line } from 'd3-shape'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useId } from 'react'
import type { useSimulation } from '../hooks/useSimulation'
import { RECORDING, RECORDING_DURATION, SEIZURE_OFFSET, SEIZURE_ONSET } from '../model/recording'
import { PHASE_ORDER, PHASES } from './phases'

type Playback = ReturnType<typeof useSimulation>

type ChartProps = {
  playback: Playback
  activeLead: number | null
  onHover: (lead: number | null) => void
  onPick: (lead: number) => void
}

const WIDTH = 1400
const ROW = 36
const HEIGHT = RECORDING.length * ROW
const PHASE_COLUMNS = `${SEIZURE_ONSET}fr ${SEIZURE_OFFSET - SEIZURE_ONSET}fr ${RECORDING_DURATION - SEIZURE_OFFSET}fr`
const REGIONS = ['Left front', 'Right front', 'Left back', 'Right back']
const SPEEDS = [0.5, 1, 2]
const TICKS = [0, 2, 4, 6, 8, 10, 12, 14]
const TRACES = RECORDING.map(({ samples }, index) => line<(typeof samples)[number]>()
  .x((sample) => timeToX(sample.time))
  .y((sample) => ROW * (index + 0.5) + sample.voltage * 0.36)(samples) ?? undefined)

function timeToX(time: number) {
  return time / RECORDING_DURATION * WIDTH
}

function PlayButton({ playback }: { playback: Playback }) {
  const label = playback.playing ? 'Pause' : 'Play'

  return (
    <button type="button" className="play-button" aria-label={label} title={label} onClick={playback.togglePlayback}>
      {playback.playing ? <Pause size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
    </button>
  )
}

function Transport({ playback }: { playback: Playback }) {
  return (
    <div className="transport">
      <PlayButton playback={playback} />
      <button type="button" className="icon-button" aria-label="Restart" title="Restart" onClick={() => playback.seek(0)}><RotateCcw size={17} aria-hidden="true" /></button>
      <span className="time-display">{playback.time.toFixed(1)} <small>/ {RECORDING_DURATION}.0 s</small></span>
      <div className="segments speed-controls" role="group" aria-label="Playback speed">
        {SPEEDS.map((speed) => (
          <button key={speed} type="button" aria-pressed={playback.speed === speed} onClick={() => playback.setSpeed(speed)}>{speed}×</button>
        ))}
      </div>
    </div>
  )
}

function Scrubber({ playback }: { playback: Playback }) {
  return (
    <input type="range" className="scrubber" aria-label="Recording time" aria-valuetext={`${playback.time.toFixed(2)} seconds`}
      min={0} max={RECORDING_DURATION} step={0.05} value={playback.time}
      onChange={(event) => playback.seek(Number(event.target.value))} />
  )
}

export function EegChart({ playback, activeLead, onHover, onPick }: ChartProps) {
  const clip = useId()
  const playhead = playback.time / RECORDING_DURATION * 100

  return (
    <div className="eeg-grid">
      <span className="eeg-corner">Lead</span>
      <div className="phase-tabs" role="group" aria-label="Jump to phase" style={{ gridTemplateColumns: PHASE_COLUMNS }}>
        {PHASE_ORDER.map((phase) => {
          const item = PHASES[phase]

          return (
            <button type="button" key={phase} data-phase={phase}
              aria-current={phase === playback.phase ? 'step' : undefined} onClick={() => playback.seek(item.start)}>
              {item.label} <span>{item.start}–{item.end} s</span>
            </button>
          )
        })}
      </div>
      <div className="eeg-leads" aria-label="EEG leads">
        {RECORDING.map(({ label }, index) => (
          <button type="button" key={label} className={activeLead === index ? 'lead-active' : undefined}
            aria-label={`${label}, ${REGIONS[index]}. Inspect electrode pair`}
            onPointerEnter={() => onHover(index)} onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(index)} onBlur={() => onHover(null)} onClick={() => onPick(index)}>
            <strong>{label}</strong><small>{REGIONS[index]}</small>
          </button>
        ))}
      </div>
      <div className="eeg-chart">
        <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none"
          role="img" aria-label="Four synthetic bipolar EEG leads. A generalized spike-and-wave pattern starts at 3 seconds and ends at 10 seconds. Negative voltage is plotted upward.">
          <defs><clipPath id={clip}><rect width={timeToX(playback.time)} height={HEIGHT} /></clipPath></defs>
          <rect className="seizure-band" x={timeToX(SEIZURE_ONSET)} width={timeToX(SEIZURE_OFFSET - SEIZURE_ONSET)} height={HEIGHT} />
          {TICKS.map((tick) => <line className="eeg-gridline" key={tick} x1={timeToX(tick)} x2={timeToX(tick)} y2={HEIGHT} />)}
          {RECORDING.slice(1).map(({ label }, index) => <line className="eeg-gridline" key={label} x2={WIDTH} y1={(index + 1) * ROW} y2={(index + 1) * ROW} />)}
          {TRACES.map((trace, index) => <path className="eeg-trace" d={trace} key={index} />)}
          <g clipPath={`url(#${clip})`} className="eeg-played">
            {TRACES.map((trace, index) => <path className={activeLead === index ? 'eeg-highlight' : 'eeg-trace'} d={trace} key={index} />)}
          </g>
        </svg>
        <span className="playhead" style={{ left: `${playhead}%` }} aria-hidden="true" />
        <Scrubber playback={playback} />
      </div>
      <span className="eeg-corner">Time</span>
      <div className="eeg-ticks" aria-hidden="true">{TICKS.map((tick) => <span key={tick}>{tick} s</span>)}</div>
    </div>
  )
}

export function SignalTimeline(props: ChartProps) {
  return (
    <section className="signal-panel" aria-label="Synthetic scalp EEG">
      <Transport playback={props.playback} />
      <EegChart {...props} />
    </section>
  )
}

export function MobileTimeline({ playback }: { playback: Playback }) {
  const playhead = playback.time / RECORDING_DURATION * 100

  return (
    <section className="mobile-transport glass" aria-label="Playback">
      <PlayButton playback={playback} />
      <div className="mini-time">
        <div className="mini-track">
          <div className="mini-bands" style={{ gridTemplateColumns: PHASE_COLUMNS }} aria-hidden="true">
            {PHASE_ORDER.map((phase) => <span key={phase} data-phase={phase} data-active={phase === playback.phase} />)}
          </div>
          <span className="playhead" style={{ left: `${playhead}%` }} aria-hidden="true" />
          <Scrubber playback={playback} />
        </div>
        <div className="mini-phases" style={{ gridTemplateColumns: PHASE_COLUMNS }} role="group" aria-label="Jump to phase">
          {PHASE_ORDER.map((phase) => (
            <button key={phase} type="button" data-phase={phase} aria-current={phase === playback.phase ? 'step' : undefined}
              onClick={() => playback.seek(PHASES[phase].start)}>{PHASES[phase].label}</button>
          ))}
        </div>
      </div>
      <span className="time-display">{playback.time.toFixed(1)} <small>/ {RECORDING_DURATION}</small></span>
    </section>
  )
}
