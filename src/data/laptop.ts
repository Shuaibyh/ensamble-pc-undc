import type { LaptopPart, LaptopPartId } from '../domain/laptop';
export const laptopModelPath = '/models/laptops/laptop_assembly.glb';
export const laptopNodes: Partial<Record<LaptopPartId, string>> = {
  base: 'Chassis_Bottom',
  motherboard: 'Motherboard',
  cpu: 'CPU',
  cmos: 'CMOS_Battery',
  ram: 'RAM_01',
  ram2: 'RAM_02',
  ssd: 'Storage_Drive',
  optical: 'Optical_Drive',
  heatpipe: 'Cooling_System',
  battery: 'Main_Battery',
  screen: 'Display_Assembly',
  batteryConnector: 'Motherboard_Cable',
  internalCover: 'Internal_Chassis_Cover',
  keyboardConnector: 'Keyboard_Internal',
  keyboard: 'Keyboard',
  touchpad: 'Touchpad',
  lowerCover: 'Top_Case',
};
type Row = [LaptopPartId, string, string, LaptopPartId[], string];
const rows: Row[] = [
  ['base', 'Chasis', 'Sostiene y protege el conjunto.', [], 'case'],
  [
    'motherboard',
    'Placa madre',
    'Comunica los componentes y distribuye la alimentación.',
    ['base'],
    'board',
  ],
  ['cpu', 'Procesador', 'Ejecuta las instrucciones de los programas.', ['motherboard'], 'board'],
  [
    'cmos',
    'Pila CMOS',
    'Mantiene el reloj y la configuración del firmware.',
    ['motherboard'],
    'battery',
  ],
  ['ram', 'Memoria RAM 1', 'Almacena temporalmente los datos en uso.', ['motherboard'], 'ram'],
  ['ram2', 'Memoria RAM 2', 'Completa la memoria del equipo.', ['ram'], 'ram'],
  [
    'ssd',
    'Unidad de almacenamiento',
    'Conserva el sistema, los programas y los archivos.',
    ['motherboard'],
    'ssd',
  ],
  ['optical', 'Unidad óptica', 'Permite leer discos ópticos.', ['motherboard'], 'ssd'],
  ['heatpipe', 'Sistema de refrigeración', 'Disipa el calor del procesador.', ['cpu'], 'cooler'],
  ['battery', 'Batería principal', 'Suministra energía al equipo.', ['motherboard'], 'battery'],
  [
    'batteryConnector',
    'Cable de placa madre',
    'Conexión original del circuito de la placa.',
    ['motherboard', 'battery'],
    'cable',
  ],
  ['screen', 'Pantalla', 'Muestra la información del equipo.', ['base'], 'screen'],
  [
    'internalCover',
    'Cubierta interior',
    'Protege el montaje interno.',
    ['cpu', 'cmos', 'ram2', 'ssd', 'optical', 'heatpipe', 'batteryConnector'],
    'case',
  ],
  [
    'keyboardConnector',
    'Conjunto interno del teclado',
    'Integra los elementos internos del teclado.',
    ['internalCover'],
    'cable',
  ],
  [
    'keyboard',
    'Teclado',
    'Permite introducir texto y comandos.',
    ['keyboardConnector'],
    'keyboard',
  ],
  ['touchpad', 'Touchpad', 'Permite controlar el cursor.', ['internalCover'], 'keyboard'],
  [
    'lowerCover',
    'Carcasa superior',
    'Cierra y protege el conjunto.',
    ['keyboard', 'touchpad', 'screen'],
    'case',
  ],
  [
    'screws',
    'Tornillos del chasis',
    'Aseguran el cierre en sus posiciones originales.',
    ['lowerCover'],
    'screw',
  ],
];
export const laptopParts: LaptopPart[] = rows.map(([id, name, purpose, depends, icon]) => ({
  id,
  name,
  description: purpose,
  purpose,
  depends,
  icon,
  location:
    id === 'screws'
      ? 'Puntos originales de fijación.'
      : 'Posición original de ' + laptopNodes[id] + ' en el modelo.',
}));
export const laptopPartById = (id: LaptopPartId): LaptopPart =>
  laptopParts.find((p) => p.id === id)!;
export const laptopConnectionIds: LaptopPartId[] = ['batteryConnector', 'keyboardConnector'];
