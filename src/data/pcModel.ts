export const pcModel = {
  path: '/models/creagal/desktop.glb',
  title: 'Partes de un ordenador de sobremesa',
  author: 'Proxecto cREAgal',
  source: 'https://skfb.ly/oQztw',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  scale: 2.4,
  offset: [0, -2.3, 0] as [number, number, number],
};

// Names are sanitized by GLTFLoader (periods removed). Every source mesh is
// assigned once; motherboard children remain together except removable units.
export const pcGroups = {
  standoffs: ['stands_2'],
  'board-screws': ['Bolt_14'],
  cpu: ['CPU_17'],
  cooler: ['coolerRad_16', 'cpuHeadCooler_18', 'cuperTubes_29', 'fan2_32'],
  ram: ['ram_41'],
  ssd: ['ssd_3', 'ssd001_4'],
  gpu: ['Empty_12', 'Cube012_28'],
  psu: ['powerSupply_0'],
  'fan-rear': ['fan1_1'],
  'sata-data': ['Cube020_63', 'Cube021_64'],
  eps: ['Cube011_55', 'Cube015_58', 'Cube016_59', 'Cube022_65', 'Cube023_66'],
  atx: ['Cube014_57', 'Cube019_62', 'Cube024_67'],
  pcie: ['Cube013_56', 'Cube017_60', 'Cube018_61', 'Cube025_68'],
} as const;
export type PcGroupId = keyof typeof pcGroups | 'board' | 'chassis';
