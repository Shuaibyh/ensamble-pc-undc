export type GuidedKind = 'pc' | 'laptop';

export type GuidedPieceId = 'pc-board' | 'pc-ram' | 'pc-gpu' | 'laptop-ram' | 'laptop-ssd';

export interface GuidedPieceDefinition {
  id: GuidedPieceId;
  sourceId: string;
  name: string;
  short: string;
  purpose: string;
  dependencies: GuidedPieceId[];
  screws: number;
  tray: readonly [number, number, number];
  tolerance: number;
  focus: readonly [number, number, number];
}

export const guidedPieces: Record<GuidedKind, readonly GuidedPieceDefinition[]> = {
  pc: [
    {
      id: 'pc-board',
      sourceId: 'board',
      name: 'Placa madre',
      short: 'Base del montaje · 4 fijaciones',
      purpose: 'Comunica los componentes y distribuye la alimentación.',
      dependencies: [],
      screws: 4,
      tray: [-4.2, 1.1, 1.8],
      tolerance: 0.85,
      focus: [-1.15, -0.46, -0.6],
    },
    {
      id: 'pc-ram',
      sourceId: 'ram',
      name: 'Memoria RAM',
      short: 'Pieza insertable en ranura',
      purpose: 'Almacena temporalmente los datos que usa el procesador.',
      dependencies: ['pc-board'],
      screws: 0,
      tray: [-4.1, -1.2, 1.7],
      tolerance: 0.65,
      focus: [-0.43, 0.14, -0.57],
    },
    {
      id: 'pc-gpu',
      sourceId: 'gpu',
      name: 'Tarjeta gráfica',
      short: 'Tarjeta de expansión PCIe',
      purpose: 'Procesa gráficos y entrega la señal de video.',
      dependencies: ['pc-board'],
      screws: 0,
      tray: [4.1, -0.9, 1.7],
      tolerance: 0.8,
      focus: [-1.34, -0.84, -0.23],
    },
  ],
  laptop: [
    {
      id: 'laptop-ram',
      sourceId: 'ram',
      name: 'Memoria RAM',
      short: 'Módulo SODIMM',
      purpose: 'Almacena temporalmente los datos en uso.',
      dependencies: [],
      screws: 0,
      tray: [-3.8, 4.2, 2.5],
      tolerance: 0.72,
      focus: [-0.35, 0.72, -0.15],
    },
    {
      id: 'laptop-ssd',
      sourceId: 'ssd',
      name: 'Unidad SSD',
      short: 'Almacenamiento · 2 fijaciones',
      purpose: 'Conserva el sistema, los programas y los archivos.',
      dependencies: [],
      screws: 2,
      tray: [3.8, 4.2, 2.5],
      tolerance: 0.78,
      focus: [1.7, 0.72, -0.35],
    },
  ],
};

export const guidedPieceById = (kind: GuidedKind, id: GuidedPieceId) =>
  guidedPieces[kind].find((piece) => piece.id === id)!;
