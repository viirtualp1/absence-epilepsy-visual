import { RECORDING_DURATION, SEIZURE_OFFSET, SEIZURE_ONSET, type phaseAt } from '../model/recording'

export type Phase = ReturnType<typeof phaseAt>

export const PHASES = {
  baseline: {
    label: 'Before',
    title: 'Background rhythms',
    start: 0,
    end: SEIZURE_ONSET,
    eeg: 'This example starts with lower-amplitude background activity. The repeating spike-and-wave pattern has yet to begin.',
    brain: 'The moving markers use different timings to illustrate less synchronized activity.',
  },
  absence: {
    label: 'During',
    title: 'Activity synchronizes',
    start: SEIZURE_ONSET,
    end: SEIZURE_OFFSET,
    eeg: 'A sharp spike and a broader wave repeat about three times per second. In childhood absence epilepsy, the generalized pattern is visible over both sides of the scalp.',
    brain: 'Markers on both sides move in step to illustrate coordination between cortex and thalamus. During this brief event, awareness can change abruptly.',
  },
  after: {
    label: 'After',
    title: 'Background returns',
    start: SEIZURE_OFFSET,
    end: RECORDING_DURATION,
    eeg: 'The spike-and-wave pattern stops and background activity returns in the example.',
    brain: 'The markers move out of step again. In a typical absence seizure, a child may quickly resume the activity they were doing.',
  },
} satisfies Record<Phase, { label: string; title: string; start: number; end: number; eeg: string; brain: string }>

export const PHASE_ORDER: Phase[] = ['baseline', 'absence', 'after']
