import { receivedCase } from './receivedCase';
import { detailAssets } from './detailAssets';

export interface ReceivedModel {
  id: string;
  name: string;
  modelPath: string;
  author: string;
  source: string;
  note: string;
  license?: string;
  licenseUrl?: string;
}

export const receivedModels: ReceivedModel[] = [
  {
    id: 'creagal-desktop',
    name: 'Partes de un ordenador de sobremesa',
    modelPath: '/models/creagal/desktop.glb',
    author: 'Proxecto cREAgal',
    source: 'https://skfb.ly/oQztw',
    license: 'CC BY-NC-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    note: 'Base del nuevo ensamblador de PC. Copia adaptada: compresión Meshopt, texturas optimizadas y separación educativa; transformaciones originales conservadas. Uso no comercial y compartir igual.',
  },
  ...detailAssets,
  {
    id: 'corsair',
    name: 'Corsair 4000D · SzaBa',
    modelPath: '/models/cases/corsair-4000d.glb',
    author: 'SzaBa',
    source: 'https://skfb.ly/oFS8V',
    note: 'Gabinete de la estación y del ensamblador anterior, con cristal e interior independientes. Se conserva como recurso original de biblioteca.',
  },
  {
    id: 'basic-pc-case',
    name: 'Basic PC case',
    modelPath: '/models/cases/basic-pc-case.glb',
    author: 'Sousinho',
    source: 'https://skfb.ly/oyEOo',
    note: 'Gabinete alternativo vacio y mas limpio para referencia visual. Incluye ventiladores integrados, por eso no reemplaza al montaje educativo desmontable.',
  },
  {
    ...receivedCase,
    id: 'case',
    note: 'Gabinete de una versión anterior. Se conserva como recurso de biblioteca; el ensamblador de PC usa el conjunto cREAgal.',
  },
  {
    id: 'psu',
    name: 'PSU Power Supply Unit',
    modelPath: '/models/power-supplies/psu.glb',
    author: 'Groovex',
    source: 'https://skfb.ly/oBPC9',
    note: 'Fuente de alimentación recibida. Conectores y dimensiones pendientes de validar.',
  },
  {
    id: 'storage',
    name: 'Storage (SSD, HDD, M.2)',
    modelPath: '/models/storage/storage.glb',
    author: 'Vivien Deroche / Blue Lantern',
    source: 'https://skfb.ly/6SNzv',
    note: 'Paquete de unidades de almacenamiento; se muestra completo con sus texturas.',
  },
  {
    id: 'gpu',
    name: 'RTX3090 (Low Poly)',
    modelPath: '/models/gpus/gpu.glb',
    author: 'JDwastaken',
    source: 'https://skfb.ly/o9IHr',
    note: 'Modelo del autor. Su apariencia no verifica dimensiones ni compatibilidad eléctrica.',
  },
  {
    id: 'motherboard',
    name: 'MotherBoard + Components',
    modelPath: '/models/motherboards/motherboard.glb',
    author: 'Daniel Cardona',
    source: 'https://skfb.ly/6RDsX',
    note: 'Práctica independiente con los grupos originales de placa, CPU, SSD y cuatro memorias. Conserva sus posiciones relativas. No corresponde al ejercicio AM5/DDR5.',
  },
  {
    id: 'ram',
    name: 'TEAMGROUP T-FORCE DELTA DDR5 DDR4 RAM',
    modelPath: '/models/ram/ram.glb',
    author: 'PolyDavid',
    source: 'https://skfb.ly/pGSQW',
    note: 'El título menciona DDR4 y DDR5; la generación y las dimensiones aún no están verificadas.',
  },
  {
    id: 'cooler',
    name: 'CPU Cooler',
    modelPath: '/models/cooling/cooler.glb',
    author: 'Fochdog',
    source: 'https://skfb.ly/onuBI',
    note: 'Refrigeración recibida con texturas. El sistema de fijación requiere revisión.',
  },
  {
    id: 'fan-header',
    name: 'Fan Header 3/4 Pin',
    modelPath: '/models/assembly-details/fan-header.glb',
    author: 'DrLex0',
    source: 'https://github.com/DrLex0/print3d-fan-header-socket',
    note: 'Conector de placa usado como referencia visual para los cables de los ventiladores.',
  },
  {
    id: 'monitor',
    name: 'Monitor',
    modelPath: '/models/peripherals/monitor.glb',
    author: 'portgl16',
    source: 'https://skfb.ly/onBo6',
    note: 'Monitor usado en la estación completa. La pantalla de encendido se genera dentro del simulador.',
  },
  {
    id: 'keyboard-peripheral',
    name: 'Mechanical Keyboard',
    modelPath: '/models/peripherals/keyboard.glb',
    author: 'FelikinRuslan',
    source: 'https://skfb.ly/6R68t',
    note: 'Teclado mecánico usado como periférico externo en la estación de trabajo.',
  },
  {
    id: 'mouse',
    name: 'Computer Mouse (Low Poly)',
    modelPath: '/models/peripherals/mouse.glb',
    author: 'LagzDesign',
    source: 'https://skfb.ly/oWQYs',
    note: 'Mouse usado como periférico externo y conectado por USB en la escena final.',
  },
  {
    id: 'laptop-shell',
    name: 'Laptop',
    modelPath: '/models/laptops/laptop-shell.glb',
    author: 'Alpha',
    source: 'https://skfb.ly/pFWYB',
    note: 'Carcasa y pantalla utilizadas como base de la vista de servicio del ensamblaje de laptop.',
  },
  {
    id: 'framework-mainboard',
    name: 'Framework Laptop Mainboard and Internals',
    modelPath: '/models/laptops/framework-mainboard.glb',
    author: 'Photo_Max',
    source: 'https://skfb.ly/osUnQ',
    note: 'Interior real usado para la placa, memoria, almacenamiento, refrigeración y componentes internos.',
  },
  {
    id: 'laptop-acer',
    name: 'Laptop Acer',
    modelPath: '/models/laptops/laptop-acer.glb',
    author: 'Romain DI CORATO',
    source: 'https://skfb.ly/oqPtN',
    note: 'Modelo usado para el acabado exterior, el teclado, el touchpad y la vista final de la laptop.',
  },
  {
    id: 'phillips-screw',
    name: 'Phillips #00 Screw',
    modelPath: '/models/laptops/phillips-screw.glb',
    author: 'swedenstyle',
    source: 'https://skfb.ly/pqRZA',
    note: 'Tornillo Phillips usado como fijación visible de la tapa inferior de la laptop.',
    license: 'CC BY-NC-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
];
