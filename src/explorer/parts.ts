import type { Phase } from './phases'

export type PartId = 'thalamus' | 'cortex' | 'pathways' | 'electrodes' | 'hindbrain'

type Part = {
  id: PartId
  meshes: readonly string[]
  name: string
  shortName: string
  kind: string
  swatch: string
  about: string
  now: Record<Phase, string>
}

export const PARTS: readonly Part[] = [
  {
    id: 'thalamus', meshes: ['Thalamus_L', 'Thalamus_R'], name: 'Thalamus', shortName: 'Thalamus',
    kind: 'Deep relay structures · left and right', swatch: '#F5B54A',
    about: 'A pair of deep relay structures that exchange signals with the cortex. These connections form part of the thalamocortical network.',
    now: {
      baseline: 'In the model, markers move at different times.',
      absence: 'Coordinated activity in the thalamocortical network is linked to the spike-and-wave pattern. The model shows the markers moving together.',
      after: 'The model returns to markers moving at different times.',
    },
  },
  {
    id: 'cortex', meshes: ['Cortex_L', 'Cortex_R'], name: 'Cerebral cortex', shortName: 'Cortex',
    kind: 'Outer surface · both hemispheres', swatch: '#B8C4DC',
    about: 'The folded outer layer of the brain. Scalp EEG mainly reflects the summed activity of groups of cortical neurons.',
    now: {
      baseline: 'The example begins with lower-amplitude background rhythms.',
      absence: 'The spike-and-wave pattern appears across both sides of the scalp EEG, which is why it is called generalized.',
      after: 'Background rhythms return in the synthetic trace.',
    },
  },
  {
    id: 'pathways', meshes: [], name: 'Thalamocortical pathways', shortName: 'Pathways',
    kind: 'Illustrative connections', swatch: '#E8BE73',
    about: 'These curves represent connections between cortex and thalamus. Their paths and moving markers are schematic.',
    now: {
      baseline: 'Markers travel at different rates and times.',
      absence: 'All six markers move together. Their motion is slowed so it is easier to follow.',
      after: 'The markers move out of step again.',
    },
  },
  {
    id: 'electrodes', meshes: [], name: 'Scalp EEG electrodes', shortName: 'Electrodes',
    kind: '8 scalp sites · 4 leads', swatch: '#ECEEF2',
    about: 'Each bipolar lead shows the voltage difference between two electrodes. Hover, focus, or select a lead to see its approximate pair on the model.',
    now: {
      baseline: 'The four leads show lower-amplitude background activity.',
      absence: 'The pattern appears in all four synthetic leads at the same time, with larger deflections in the frontal leads.',
      after: 'The leads return to background activity.',
    },
  },
  {
    id: 'hindbrain', meshes: ['Hindbrain_L', 'Hindbrain_R'], name: 'Cerebellum and brainstem', shortName: 'Cerebellum',
    kind: 'Shown for orientation', swatch: '#8190AB',
    about: 'The cerebellum and brainstem help orient the model. The illustration focuses on the cortex and thalamus.',
    now: {
      baseline: 'The model shows these structures for orientation.',
      absence: 'The circuit overlay leaves these structures unchanged.',
      after: 'The model shows these structures for orientation.',
    },
  },
]

export function getPart(id: PartId) {
  return PARTS.find((part) => part.id === id)!
}
