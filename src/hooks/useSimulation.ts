import { useState } from 'react'
import {
  Mode,
  type State,
  ABSENCE_THRESHOLD,
  ABSENCE_DURATION,
  SEIZURE_FREQUENCY,
} from '@/types/simulation'

// --- Normal mode dynamics ---
const NORMAL_NOISE_AMPLITUDE = 0.1 // сила случайных флуктуаций
const THALAMUS_NOISE_FACTOR = 0.5 // таламус менее хаотичен

// --- Seizure dynamics ---
const SEIZURE_CORTEX_FEEDBACK = 0.7 // насколько кора следует за таламусом
const SEIZURE_CORTEX_INERTIA = 0.3 // сколько остаётся собственной инерции

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export const useSimulation = () => {
  const [state, setState] = useState<State>({
    cortex: 0,
    thalamus: 0,
    mode: Mode.Normal,
    consciousness: 1,
    seizureTime: 0,
    previousThalamus: 0,
  })

  function step(state: State, deltaTime: number): State {
    // ===============================
    // 1️⃣ NORMAL MODE
    // ===============================
    if (state.mode === Mode.Normal) {
      const noise = (Math.random() - 0.5) * NORMAL_NOISE_AMPLITUDE

      const cortex = clamp(state.cortex + noise, 0, 1)

      const thalamus = clamp(
        state.thalamus + noise * THALAMUS_NOISE_FACTOR,
        0,
        1
      )

      if (cortex > ABSENCE_THRESHOLD) {
        return {
          ...state,
          mode: Mode.Seizure,
          seizureTime: 0,
          cortex,
          thalamus,
          previousThalamus: thalamus,
          consciousness: 0.2,
        }
      }

      return {
        ...state,
        cortex,
        thalamus,
        consciousness: 1,
      }
    }

    // ===============================
    // 2️⃣ SEIZURE MODE
    // ===============================

    const newTime = state.seizureTime + deltaTime
    if (newTime > ABSENCE_DURATION) {
      return {
        ...state,
        mode: Mode.Normal,
        seizureTime: 0,
        consciousness: 1,
      }
    }

    const timeInSeconds = newTime / 1000

    const oscillation = Math.sin(
      2 * Math.PI * SEIZURE_FREQUENCY * timeInSeconds
    )
    const normalizedOscillation = 0.5 + oscillation * 0.5

    const newThalamus = normalizedOscillation
    const newCortex =
      SEIZURE_CORTEX_FEEDBACK * state.previousThalamus +
      SEIZURE_CORTEX_INERTIA * state.cortex

    return {
      ...state,
      seizureTime: newTime,
      cortex: clamp(newCortex, 0, 1),
      thalamus: newThalamus,
      previousThalamus: newThalamus,
      consciousness: 0.2,
    }
  }

  return {
    state,
    setState,

    step,
  }
}
