export enum Mode {
  Normal = 'normal',
  Seizure = 'seizure',
}

export interface State {
  cortex: number
  thalamus: number
  mode: Mode
  consciousness: number
  seizureTime: number
  previousThalamus: number
}

export const ABSENCE_THRESHOLD = 0.8
export const ABSENCE_DURATION = 3000
export const SEIZURE_FREQUENCY = 3
