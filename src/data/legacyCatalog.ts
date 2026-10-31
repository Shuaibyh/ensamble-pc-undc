import type { Part, Vec3, CableId, PartId } from '../domain/types';
import { assemblyModels } from './assemblyModels';
import { receivedModels } from './receivedModels';
import { detailDefinitions } from './assemblyDetails';
const definitions: Omit<Part, 'category' | 'asset' | 'specifications'>[] = [
  {
    id: 'board',
    name: 'Placa madre',
    spec: 'Modelo recibido · MotherBoard + Components',
    icon: '▦',
    description: 'Conecta los componentes y permite que intercambien información.',
    location: 'Sobre los separadores del panel interior del gabinete.',
    depends: ['standoffs'],
    position: [0, 0.45, -0.63],
    size: [2.35, 2.45, 0.12],
    color: '#334f62',
  },
  {
    id: 'cpu',
    name: 'Procesador',
    spec: 'Procesador separado de la placa recibida',
    icon: '▣',
    description:
      'Ejecuta las instrucciones de los programas. Alinea la marca de orientación con el socket.',
    location: 'En el socket central superior de la placa madre.',
    depends: ['board-screws'],
    position: [-0.18, 0.94, -0.48],
    size: [0.57, 0.57, 0.12],
    color: '#becbd4',
  },
  {
    id: 'cooler',
    name: 'Disipador',
    spec: 'CPU Cooler · modelo recibido',
    icon: '✺',
    description:
      'Transfiere el calor del procesador al aire. Aplica antes la pasta térmica y conecta después CPU_FAN.',
    location: 'Encima del procesador y la capa de pasta térmica.',
    depends: ['cpu', 'paste'],
    position: [-0.18, 0.94, -0.02],
    size: [0.85, 0.85, 0.7],
    color: '#8299ae',
  },
  {
    id: 'ram',
    name: 'Memoria RAM',
    spec: 'T-FORCE DELTA · generación sin verificar',
    icon: '▥',
    description:
      'Guarda temporalmente los datos que usa el procesador. La muesca determina su orientación.',
    location: 'En la ranura DIMM a la derecha del procesador.',
    depends: ['board'],
    position: [0.73, 0.93, -0.36],
    size: [0.15, 1.16, 0.35],
    color: '#6984e9',
  },
  {
    id: 'ssd',
    name: 'Almacenamiento SSD',
    spec: 'M.2 extraído de Storage (SSD, HDD, M.2)',
    icon: '▰',
    description:
      'Almacena el sistema y los archivos. Recibe energía a través de la placa, sin cable adicional.',
    location: 'En la ranura M.2 debajo del procesador.',
    depends: ['board'],
    position: [-0.23, 0.13, -0.47],
    size: [0.82, 0.24, 0.12],
    color: '#3c9b91',
  },
  {
    id: 'gpu',
    name: 'Tarjeta gráfica',
    spec: 'RTX3090 (Low Poly) · modelo recibido',
    icon: '▤',
    description:
      'Procesa las imágenes. El ejercicio representa su alimentación con una conexión simplificada, sin reproducir el cableado real de esta tarjeta.',
    location: 'En la ranura PCIe x16, en la zona inferior de la placa.',
    depends: ['board', 'ssd'],
    position: [0, -0.43, 0.04],
    size: [2.13, 0.43, 1.12],
    color: '#3b455d',
  },
  {
    id: 'psu',
    name: 'Fuente de alimentación',
    spec: 'PSU Power Supply Unit · modelo recibido',
    icon: '▧',
    description: 'Suministra energía al equipo mediante conexiones separadas.',
    location: 'En el compartimento inferior del gabinete.',
    depends: [],
    position: [-0.45, -1.45, 0],
    size: [1.45, 0.72, 1.35],
    color: '#424b5f',
  },
];
const categories: Partial<Record<PartId, Part['category']>> = {
  board: 'Plataforma',
  cpu: 'Plataforma',
  cooler: 'Refrigeración',
  ram: 'Memoria',
  ssd: 'Almacenamiento',
  gpu: 'Gráficos',
  psu: 'Alimentación',
};
const specifications: Partial<Record<PartId, Part['specifications']>> = {
  board: { status: 'Dimensiones y socket sin certificar' },
  cpu: { status: 'Grupo original de la placa recibida' },
  cooler: { status: 'Anclaje sin certificar' },
  ram: { status: 'DDR4/DDR5 sin certificar' },
  ssd: { interface: 'M.2 representado' },
  gpu: { status: 'Alimentación simplificada del ejercicio' },
  psu: { status: 'Potencia y conectores sin certificar' },
};
// Orden topológico para la guía; las reglas permiten alternativas independientes.
const ordered = [
  detailDefinitions[0],
  definitions[0],
  detailDefinitions[1],
  definitions[1],
  detailDefinitions[2],
  ...definitions.slice(2),
  ...detailDefinitions.slice(3),
];
export const parts: Part[] = ordered.map((part) => ({
  ...part,
  position: assemblyModels[part.id].position,
  size: assemblyModels[part.id].size,
  category:
    categories[part.id] ??
    detailDefinitions.find((item) => item.id === part.id)?.category ??
    'Montaje',
  specifications: specifications[part.id] ?? {},
  asset: {
    modelPath: assemblyModels[part.id].path,
    thumbnailPath:
      '/thumbnails/' +
      (part.id.startsWith('fan-')
        ? 'cooler'
        : ['standoffs', 'board-screws', 'paste'].includes(part.id)
          ? 'cpu'
          : part.id) +
      '.svg',
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    anchor: [0, 0, 0],
    author: receivedModels.find((model) => model.modelPath === assemblyModels[part.id].path)!
      .author,
    source: receivedModels.find((model) => model.modelPath === assemblyModels[part.id].path)!
      .source,
    license: 'CC BY 4.0',
    modifications: 'Grupo separado, orientación y escala uniforme para el montaje visual',
  },
}));
export const categoriesList = ['Todas', ...new Set(parts.map((part) => part.category))];
export const chassis = {
  id: 'case',
  name: 'Gabinete educativo Micro-ATX',
  category: 'Gabinete',
  description:
    'Chasis abierto. Sus ventiladores originales se ocultan en el ejercicio para empezar vacío.',
  position: [0, 0, 0] as Vec3,
  depends: [],
  specifications: { formFactor: 'Micro-ATX', includedFans: 2 },
  asset: {
    modelPath: null,
    thumbnailPath: '/thumbnails/case.svg',
    scale: [1, 1, 1] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    anchor: [0, 0, 0] as Vec3,
    author: 'Laboratorio Interactivo de Hardware UNDC',
    source: 'Geometría original del proyecto',
    license: 'Recurso propio; sin licencia externa',
    modifications: 'Panel desmontable y ventiladores geométricos',
  },
};
export const includedFans = {
  id: 'case-fans',
  name: 'Ventiladores del archivo original',
  category: 'Refrigeración',
  description:
    'Se conservan en la biblioteca, pero se ocultan durante el montaje. El ejercicio instala cuatro ventiladores recibidos por separado.',
  asset: { ...chassis.asset, thumbnailPath: '/thumbnails/cooler.svg' },
  position: [1.39, 0, 0] as Vec3,
  depends: ['case'],
  specifications: { count: 2 },
};
export const cables: {
  id: CableId;
  name: string;
  pins: number;
  depends: PartId[];
  points: Vec3[];
}[] = [
  ...(['fan-top', 'fan-middle', 'fan-bottom', 'fan-rear', 'cpu-fan'] as const).map((id, index) => ({
    id,
    pins: 4,
    name: index === 4 ? 'CPU_FAN · disipador' : `SYS_FAN ${index + 1} · ventilador`,
    depends: ['board', id === 'cpu-fan' ? 'cooler' : id] as PartId[],
    points: [
      id === 'cpu-fan' ? [-0.3, 1.2, 0.1] : assemblyModels[id].position,
      [0.65, 0.9 - index * 0.22, -0.48],
      [0.4, 0.9 - index * 0.22, -0.82],
    ] as Vec3[],
  })),
  {
    id: 'atx',
    pins: 24,
    name: 'ATX · placa madre · 24 pines',
    depends: ['psu', 'board'],
    points: [
      [-0.54, -1.55, 0.34],
      [0.88, -1.08, -0.46],
      [0.94, 1.01, -0.55],
      [0.51, 1.01, -0.69],
    ],
  },
  {
    id: 'eps',
    pins: 8,
    name: 'EPS · procesador · 8 pines',
    depends: ['psu', 'board', 'cpu'],
    points: [
      [-0.54, -1.64, 0.12],
      [-1.95, -1.04, -0.56],
      [-2.03, 1.96, -0.6],
      [-1.63, 1.96, -0.69],
    ],
  },
  {
    id: 'pcie',
    pins: 8,
    name: 'PCIe · tarjeta gráfica · 8 pines',
    depends: ['psu', 'gpu'],
    points: [
      [-0.54, -1.7, 0.48],
      [0.5, -1.12, 0.54],
      [0.5, -0.23, 0.47],
    ],
  },
];
