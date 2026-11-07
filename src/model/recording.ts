export const RECORDING_DURATION = 14
export const SEIZURE_ONSET = 3
export const SEIZURE_OFFSET = 10
export const SPIKE_WAVE_HZ = 3
export const SAMPLE_RATE = 256

export const LEADS = [
  { label: 'Fp1–F3', gain: 1 },
  { label: 'Fp2–F4', gain: 0.94 },
  { label: 'P3–O1', gain: 0.53 },
  { label: 'P4–O2', gain: 0.49 },
]

export function phaseAt(time: number): 'baseline' | 'absence' | 'after' {
  if (time < SEIZURE_ONSET) return 'baseline'
  if (time < SEIZURE_OFFSET) return 'absence'
  return 'after'
}

function gaussian(time: number, center: number, width: number) {
  return Math.exp(-0.5 * ((time - center) / width) ** 2)
}

function voltage(time: number, index: number, gain: number) {
  const background =
    4 * Math.sin(2 * Math.PI * 9.4 * time + index * 1.9) +
    2.2 * Math.sin(2 * Math.PI * 5.7 * time + index * 1.1) +
    1.6 * Math.sin(2 * Math.PI * 13.8 * time + index * 2.4)

  if (phaseAt(time) !== 'absence') return background

  const elapsed = time - SEIZURE_ONSET
  const cycleTime = elapsed % (1 / SPIKE_WAVE_HZ)
  const complex =
    -43 * gaussian(cycleTime, 0.038, 0.01) +
    24 * gaussian(cycleTime, 0.133, 0.044)
  return background * 0.7 + gain * complex * (1 + 0.11 * Math.sin(elapsed * 3))
}

export const RECORDING = LEADS.map((lead, index) => ({
  ...lead,
  samples: Array.from({ length: RECORDING_DURATION * SAMPLE_RATE + 1 }, (_, sample) => {
    const time = sample / SAMPLE_RATE
    return { time, voltage: voltage(time, index, lead.gain) }
  }),
}))
