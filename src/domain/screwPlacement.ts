export interface ScrewState {
  selected: number | null;
  inserting: number | null;
  installed: number[];
}
export type ScrewAction =
  | { type: 'select'; index: number }
  | { type: 'insert' }
  | { type: 'finish'; index: number }
  | { type: 'reset' };
export function emptyScrews(): ScrewState {
  return { selected: null, inserting: null, installed: [] };
}
export function screwTransition(
  state: ScrewState,
  action: ScrewAction,
  count: number,
  ready: boolean,
): ScrewState {
  if (action.type === 'reset') return emptyScrews();
  if (!ready) return state;
  if (action.type === 'finish') {
    if (state.inserting !== action.index || state.installed.includes(action.index)) return state;
    return { selected: null, inserting: null, installed: [...state.installed, action.index] };
  }
  if (state.inserting !== null) return state;
  if (action.type === 'select') {
    if (
      !Number.isInteger(action.index) ||
      action.index < 0 ||
      action.index >= count ||
      state.installed.includes(action.index)
    )
      return state;
    return { ...state, selected: action.index };
  }
  if (state.selected === null || state.installed.includes(state.selected)) return state;
  return { ...state, inserting: state.selected };
}
