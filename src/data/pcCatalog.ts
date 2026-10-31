import type { Part, PartId, CableId, Vec3 } from '../domain/types';
import { parts as previousParts } from './legacyCatalog';
import { pcModel } from './pcModel';
import targets from './pcTargets.json';
export { chassis, includedFans } from './legacyCatalog';

const descriptions: Partial<Record<PartId, Partial<Part>>> = {
  board: {
    spec: 'Placa del conjunto cREAgal',
    location: 'Sobre los separadores, en la pared interior del gabinete.',
  },
  cpu: {
    spec: 'Procesador del conjunto cREAgal',
    location: 'En el socket original de la placa madre.',
  },
  cooler: {
    spec: 'Radiador, base, tubos de cobre y ventilador',
    location: 'Sobre el procesador, conservando los anclajes del modelo.',
  },
  ram: {
    spec: 'Memoria del conjunto cREAgal',
    location: 'En las ranuras situadas junto al procesador.',
  },
  ssd: {
    name: 'Unidades SSD SATA',
    spec: 'Dos unidades en sus bandejas',
    description:
      'Almacenan el sistema y los archivos. Se conectan a la placa mediante SATA y reciben alimentación de la fuente.',
    location: 'En las dos bandejas inferiores de la zona frontal.',
    depends: [],
  },
  gpu: {
    spec: 'Tarjeta gráfica del modelo · GTX 780 representada',
    location: 'En la ranura de expansión de la placa, con las salidas hacia atrás.',
    depends: ['board-screws'],
  },
  psu: { spec: 'Fuente del conjunto cREAgal', location: 'En el compartimento superior trasero.' },
  'fan-rear': {
    name: 'Ventilador de gabinete',
    spec: 'Ventilador trasero original',
    description:
      'Extrae aire caliente del gabinete. Su alimentación se conecta por separado a la placa.',
    location: 'En la abertura posterior, debajo de la fuente.',
  },
  standoffs: { spec: 'Soportes originales del gabinete' },
  'board-screws': { spec: 'Fijaciones originales de la placa' },
  paste: {
    spec: 'Capa térmica educativa',
    location: 'Una capa fina sobre la superficie del procesador.',
  },
};
export const parts: Part[] = previousParts
  .filter((p) => !['fan-top', 'fan-middle', 'fan-bottom'].includes(p.id))
  .map((p) => {
    const target =
      p.id === 'paste'
        ? {
            position: [
              targets.cpu.position[0],
              targets.cpu.position[1],
              targets.cpu.position[2] + targets.cpu.size[2] / 2 + 0.004,
            ],
            size: [targets.cpu.size[0] * 0.8, targets.cpu.size[1] * 0.8, 0.006],
          }
        : targets[p.id as keyof typeof targets];
    return {
      ...p,
      ...descriptions[p.id],
      position: target.position as Vec3,
      size: target.size as Vec3,
      specifications: {
        status: 'Representación educativa; compatibilidad comercial sin certificar',
      },
      asset:
        p.id === 'paste'
          ? {
              ...p.asset,
              modifications: 'Jeringa original y aplicación adaptadas al procesador cREAgal',
            }
          : {
              ...p.asset,
              modelPath: pcModel.path,
              author: pcModel.author,
              source: pcModel.source,
              license: pcModel.license,
              modifications:
                'Separación pedagógica; transformaciones originales conservadas; compresión y texturas optimizadas',
            },
    };
  });
export const categoriesList = ['Todas', ...new Set(parts.map((p) => p.category))];

// Source-model connectors; original geometry for ATX/EPS/GPU/SATA data.
export const cables: {
  id: CableId;
  name: string;
  pins: number;
  depends: PartId[];
  points: Vec3[];
}[] = [
  {
    id: 'atx',
    name: 'ATX · alimentación de placa',
    pins: 24,
    depends: ['psu', 'board'],
    points: [
      [-0.94, 1.5, 0.1],
      [0.02, 0.32, -0.55],
    ],
  },
  {
    id: 'eps',
    name: 'CPU · alimentación del procesador',
    pins: 8,
    depends: ['psu', 'board', 'cpu'],
    points: [
      [-0.94, 1.6, 0.1],
      [-1.83, 1.06, -0.57],
    ],
  },
  {
    id: 'pcie',
    name: 'PCIe · alimentación de GPU',
    pins: 8,
    depends: ['psu', 'gpu'],
    points: [
      [-0.94, 1.4, 0.1],
      [-0.44, -0.85, 0.47],
    ],
  },
  {
    id: 'sata-data',
    name: 'SATA · datos de las dos unidades',
    pins: 7,
    depends: ['board', 'ssd'],
    points: [
      [-0.1, -1.4, -0.68],
      [1.19, -1.55, -0.35],
    ],
  },
  {
    id: 'sata-power',
    name: 'SATA · alimentación de unidades',
    pins: 15,
    depends: ['psu', 'ssd'],
    points: [
      [-0.94, 1.5, -0.1],
      [0.45, 1.5, 0.55],
      [0.55, -1.24, 0.55],
      [1.2, -1.24, -0.25],
      [1.2, -1.55, -0.25],
    ],
  },
  {
    id: 'cpu-fan',
    name: 'CPU_FAN · refrigeración',
    pins: 4,
    depends: ['board', 'cooler'],
    points: [
      [-1.2, -0.1, 0.01],
      [-1.65, 0.1, 0.1],
      [-1.7, 0.7, -0.65],
    ],
  },
  {
    id: 'fan-rear',
    name: 'SYS_FAN · ventilador trasero',
    pins: 4,
    depends: ['board', 'fan-rear'],
    points: [
      [-2.23, 0.4, 0.6],
      [-2.05, -0.1, 0.6],
      [-2, -0.5, -0.6],
    ],
  },
];
