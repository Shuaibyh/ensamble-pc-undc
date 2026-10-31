import type { PartId, Vec3 } from '../domain/types';
import { detailModels } from './assemblyDetails';

export interface AssemblyModel {
  path: string;
  node?: string;
  exclude?: string[];
  rotation: Vec3;
  referenceAxis: 'x' | 'y' | 'z';
  referenceLength: number;
  position: Vec3;
  size: Vec3;
}

// Unidades visuales: 10 unidades por metro de referencia. Se conserva la proporción
// de cada archivo; estas referencias de tamaño no certifican medidas del fabricante.
export const assemblyModels: Record<PartId, AssemblyModel> = {
  ...detailModels,
  board: {
    path: '/models/motherboards/motherboard.glb',
    node: 'MotherBoard',
    rotation: [0, 0, 0],
    referenceAxis: 'y',
    referenceLength: 3.05,
    position: [-0.7, 0.57, -0.67],
    size: [2.511, 3.05, 0.413],
  },
  cpu: {
    path: '/models/motherboards/motherboard.glb',
    node: 'CPU',
    rotation: [0, 0, 0],
    referenceAxis: 'x',
    referenceLength: 0.36596,
    position: [-0.57832, 1.20138, -0.81456],
    size: [0.366, 0.366, 0.045],
  },
  ram: {
    path: '/models/ram/ram.glb',
    rotation: [Math.PI / 2, 0, 0],
    referenceAxis: 'y',
    referenceLength: 1.32,
    position: [0.156, 1.208, -0.601],
    size: [0.064, 1.32, 0.428],
  },
  ssd: {
    path: '/models/storage/storage.glb',
    node: 'Cube_3',
    rotation: [Math.PI / 2, 0, 0],
    referenceAxis: 'x',
    referenceLength: 0.757,
    position: [-0.734, 0.454, -0.789],
    size: [0.757, 0.209, 0.017],
  },
  gpu: {
    path: '/models/gpus/gpu.glb',
    rotation: [0, -Math.PI / 2, Math.PI / 2],
    referenceAxis: 'x',
    referenceLength: 2.75,
    position: [-0.62, -0.3, -0.145],
    size: [2.75, 0.389, 1.278],
  },
  cooler: {
    path: '/models/cooling/cooler.glb',
    rotation: [Math.PI / 2, 0, 0],
    referenceAxis: 'z',
    referenceLength: 1.2,
    position: [-0.57832, 1.20138, -0.19],
    size: [0.628, 0.967, 1.2],
  },
  psu: {
    path: '/models/power-supplies/psu.glb',
    // Tornillo flotante del archivo original, fuera del cuerpo de la fuente.
    exclude: ['Cone_45'],
    rotation: [0, Math.PI / 2, 0],
    referenceAxis: 'z',
    referenceLength: 1.5,
    position: [-1.24, -1.61, 0],
    size: [1.668, 0.771, 1.5],
  },
};

export const casePlacement = {
  path: '/models/cases/corsair-4000d.glb',
  scale: 8.2,
  rotation: [0, Math.PI / 2, 0] as Vec3,
  center: [-0.000995429, 0.27655439, -0.000278606] as Vec3,
};
