import { parts, cables } from '../data/catalog';
import type { PartId, CableId } from './types';
import { specificationIssues } from './specifications';
export type { PartId, CableId, Vec3, Part } from './types';
export { parts, cables } from '../data/catalog';
export interface Assembly {
  installed: PartId[];
  connected: CableId[];
  powered: boolean;
}
export const emptyAssembly = (): Assembly => ({ installed: [], connected: [], powered: false });
export function installIssues(state: Assembly, id: PartId): string[] {
  const part = parts.find((item) => item.id === id)!;
  return [
    ...part.depends
      .filter((dep) => !state.installed.includes(dep))
      .map(
        (dep) => `Instala primero ${parts.find((item) => item.id === dep)!.name.toLowerCase()}.`,
      ),
    ...specificationIssues(
      part,
      parts.filter((item) => state.installed.includes(item.id)),
    ),
  ];
}
export function removeIssues(state: Assembly, id: PartId): string[] {
  return [
    ...parts
      .filter((p) => state.installed.includes(p.id) && p.depends.includes(id))
      .map((p) => `Retira primero: ${p.name}.`),
    ...cables
      .filter((c) => state.connected.includes(c.id) && c.depends.includes(id))
      .map((c) => `Desconecta: ${c.name}.`),
  ];
}
export function powerIssues(state: Assembly): string[] {
  const installed = parts.filter((part) => state.installed.includes(part.id));
  return [
    ...installed.flatMap((part) => specificationIssues(part, installed)),
    ...parts
      .filter((p) => !state.installed.includes(p.id))
      .map((p) => `Falta instalar: ${p.name}.`),
    ...cables
      .filter((c) => !state.connected.includes(c.id))
      .map((c) => `Falta conectar: ${c.name}.`),
  ];
}
export type Action =
  | { type: 'install'; id: PartId }
  | { type: 'remove'; id: PartId }
  | { type: 'connect'; id: CableId }
  | { type: 'disconnect'; id: CableId }
  | { type: 'power' }
  | { type: 'off' }
  | { type: 'reset' };
export function transition(state: Assembly, action: Action): Assembly {
  if (action.type === 'reset') return emptyAssembly();
  if (action.type === 'off') return { ...state, powered: false };
  if (state.powered) return state;
  if (action.type === 'power')
    return powerIssues(state).length ? state : { ...state, powered: true };
  if (action.type === 'install')
    return state.installed.includes(action.id) || installIssues(state, action.id).length
      ? state
      : { ...state, installed: [...state.installed, action.id] };
  if (action.type === 'remove')
    return removeIssues(state, action.id).length
      ? state
      : { ...state, installed: state.installed.filter((id) => id !== action.id) };
  if (action.type === 'connect')
    return state.connected.includes(action.id) ||
      cables.find((c) => c.id === action.id)!.depends.some((p) => !state.installed.includes(p))
      ? state
      : { ...state, connected: [...state.connected, action.id] };
  return { ...state, connected: state.connected.filter((id) => id !== action.id) };
}
