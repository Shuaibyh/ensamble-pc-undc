export const boardGroups = [
  { id: 'MotherBoard', name: 'Placa madre', description: 'Base que conecta los componentes.' },
  { id: 'CPU', name: 'Procesador', description: 'Ejecuta instrucciones; se coloca en el zócalo.' },
  { id: 'M2', name: 'SSD M.2', description: 'Almacena el sistema y los archivos.' },
  { id: 'RAM', name: 'Memoria · módulo 1', description: 'Memoria temporal del equipo.' },
  { id: 'RAM1', name: 'Memoria · módulo 2', description: 'Segundo módulo del modelo original.' },
  { id: 'RAM2', name: 'Memoria · módulo 3', description: 'Tercer módulo del modelo original.' },
  { id: 'RAM3', name: 'Memoria · módulo 4', description: 'Cuarto módulo del modelo original.' },
] as const;

export type BoardGroup = (typeof boardGroups)[number]['id'];

export function changeBoardGroup(installed: BoardGroup[], id: BoardGroup, install: boolean) {
  if (install && installed.includes(id)) return { error: 'Esta pieza ya está instalada.' };
  if (!install && !installed.includes(id)) return { error: 'Esta pieza ya está retirada.' };
  if (install && id !== 'MotherBoard' && !installed.includes('MotherBoard')) {
    return { error: 'Instala primero la placa madre.' };
  }
  if (!install && id === 'MotherBoard' && installed.length > 1) {
    return { error: 'Retira primero el procesador, las memorias y el SSD.' };
  }
  return { installed: install ? [...installed, id] : installed.filter((item) => item !== id) };
}
