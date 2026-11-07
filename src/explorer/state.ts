import type { PartId } from './parts'

export type View = 'circuit' | 'anatomy'
export type Preset = 'top' | 'side' | 'front'
export type SheetTab = 'part' | 'eeg' | 'phase'
export type CameraRequest = { preset: Preset }
export type Pin = { id: PartId; x: number; y: number }
export type Hover = Pin | null

type ExplorerState = {
  view: View
  preset: Preset
  selected: PartId | null
  hovered: PartId | null
  activeLead: number | null
  pickedLead: number | null
  autoRotate: boolean
  camera: CameraRequest | null
  tab: SheetTab
}

type Action =
  | { type: 'view'; view: View }
  | { type: 'preset'; preset: Preset }
  | { type: 'reset' }
  | { type: 'select'; id: PartId | null; lead?: number }
  | { type: 'hover'; id: PartId | null }
  | { type: 'hover-lead'; lead: number | null }
  | { type: 'rotate'; enabled: boolean }
  | { type: 'tab'; tab: SheetTab }

export const INITIAL_STATE: ExplorerState = {
  view: 'circuit',
  preset: 'top',
  selected: null,
  hovered: null,
  activeLead: null,
  pickedLead: null,
  autoRotate: false,
  camera: null,
  tab: 'part',
}

export function partVisible(id: PartId, view: View) {
  return view === 'circuit' || (id !== 'thalamus' && id !== 'pathways')
}

export function explorerReducer(state: ExplorerState, action: Action): ExplorerState {
  switch (action.type) {
    case 'view': {
      const selected = state.selected && partVisible(state.selected, action.view) ? state.selected : null

      return { ...state, view: action.view, selected, hovered: null }
    }
    case 'preset':
      return { ...state, preset: action.preset, camera: { preset: action.preset }, autoRotate: false }
    case 'reset':
      return { ...state, preset: 'top', camera: { preset: 'top' }, autoRotate: false }
    case 'select':
      return {
        ...state,
        view: action.id && !partVisible(action.id, state.view) ? 'circuit' : state.view,
        selected: action.id,
        pickedLead: action.lead ?? null,
        tab: action.id && action.lead === undefined ? 'part' : state.tab,
      }
    case 'hover':
      return state.hovered === action.id ? state : { ...state, hovered: action.id }
    case 'hover-lead':
      return state.activeLead === action.lead ? state : { ...state, activeLead: action.lead }
    case 'rotate':
      return state.autoRotate === action.enabled ? state : { ...state, autoRotate: action.enabled }
    case 'tab':
      return { ...state, tab: action.tab }
  }
}
