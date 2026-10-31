import { laptopPartById, laptopParts } from '../data/laptop';

export type LaptopPartId =
  | 'cpu'
  | 'cmos'
  | 'ram2'
  | 'optical'
  | 'touchpad'
  | 'internalCover'
  | 'base'
  | 'motherboard'
  | 'battery'
  | 'ram'
  | 'ssd'
  | 'wifi'
  | 'antennas'
  | 'heatpipe'
  | 'fan'
  | 'fanConnector'
  | 'screen'
  | 'screenFlex'
  | 'keyboard'
  | 'keyboardConnector'
  | 'speakers'
  | 'batteryConnector'
  | 'lowerCover'
  | 'screws';

export interface LaptopAssembly {
  installed: LaptopPartId[];
}
export interface LaptopPart {
  id: LaptopPartId;
  name: string;
  description: string;
  purpose: string;
  location: string;
  depends: LaptopPartId[];
  icon: string;
}
export const emptyLaptopAssembly = (): LaptopAssembly => ({ installed: ['base'] });

export function laptopIssues(state: LaptopAssembly, id: LaptopPartId): string[] {
  if (state.installed.includes(id)) return ['Esta pieza ya está instalada.'];
  if (state.installed.includes('lowerCover') && id !== 'screws')
    return ['Retira los tornillos y abre la tapa inferior antes de modificar el interior.'];
  return laptopPartById(id)
    .depends.filter((dependency) => !state.installed.includes(dependency))
    .map((dependency) => `Instala primero ${laptopPartById(dependency).name.toLowerCase()}.`);
}
export function installLaptopPart(state: LaptopAssembly, id: LaptopPartId): LaptopAssembly {
  return laptopIssues(state, id).length ? state : { installed: [...state.installed, id] };
}
export function laptopRemovalIssues(state: LaptopAssembly, id: LaptopPartId): string[] {
  if (id === 'base') return ['El chasis es la base del ejercicio.'];
  if (!state.installed.includes(id)) return ['Esta pieza todavía no está instalada.'];
  if (state.installed.includes('lowerCover') && id !== 'screws' && id !== 'lowerCover')
    return ['Retira los tornillos y la tapa inferior para acceder al interior.'];
  return state.installed
    .filter((other) => other !== id && laptopPartById(other).depends.includes(id))
    .map((other) => `Retira primero ${laptopPartById(other).name.toLowerCase()}.`);
}
export function removeLaptopPart(state: LaptopAssembly, id: LaptopPartId): LaptopAssembly {
  return laptopRemovalIssues(state, id).length
    ? state
    : { installed: state.installed.filter((part) => part !== id) };
}
export function checkLaptopAssembly(state: LaptopAssembly): string[] {
  return laptopParts.filter((part) => !state.installed.includes(part.id)).map((part) => part.name);
}
