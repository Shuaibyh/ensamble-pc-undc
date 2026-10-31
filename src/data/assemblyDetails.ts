import type { Part, Vec3 } from '../domain/types';
import type { AssemblyModel } from './assemblyModels';

export type DetailId =
  'standoffs' | 'board-screws' | 'paste' | 'fan-top' | 'fan-middle' | 'fan-bottom' | 'fan-rear';
export const mountingOffsets: Vec3[] = [-1.17, 1.17].flatMap((x) =>
  [-1.44, 0, 1.43].map((y) => [x, y, 0] as Vec3),
);
const fan = (position: Vec3, rear = false): AssemblyModel => ({
  path: '/models/assembly-details/fan.glb',
  rotation: [0, rear ? -Math.PI / 2 : Math.PI / 2, 0],
  referenceAxis: 'y',
  referenceLength: 1.2,
  position,
  size: [0.26, 1.2, 1.2],
});
export const detailModels: Record<DetailId, AssemblyModel> = {
  standoffs: {
    path: '/models/assembly-details/standoff.glb',
    node: 'M3x3-Standoff001',
    rotation: [Math.PI / 2, 0, 0],
    referenceAxis: 'z',
    referenceLength: 0.07,
    position: [-0.7, 0.57, -0.915],
    size: [2.45, 3, 0.07],
  },
  'board-screws': {
    path: '/models/assembly-details/screw.glb',
    rotation: [0, -Math.PI / 2, 0],
    referenceAxis: 'z',
    referenceLength: 0.07,
    position: [-0.7, 0.57, -0.858],
    size: [2.45, 3, 0.07],
  },
  paste: {
    path: '/models/assembly-details/paste.glb',
    rotation: [0, 0, 0],
    referenceAxis: 'y',
    referenceLength: 0.5,
    position: [-0.57832, 1.20138, -0.789],
    size: [0.28, 0.28, 0.009],
  },
  'fan-top': fan([1.97, 1.44, 0]),
  'fan-middle': fan([1.97, 0.19, 0]),
  'fan-bottom': fan([1.97, -1.06, 0]),
  'fan-rear': fan([-1.98, 1.4, 0], true),
};
export const detailDefinitions: Omit<Part, 'asset'>[] = [
  {
    id: 'standoffs',
    name: 'Separadores de placa',
    category: 'Fijaciones',
    spec: 'M3_standOff · 6 posiciones educativas',
    icon: '⬡',
    description:
      'Separan la placa del metal del gabinete. El conjunto se instala antes de la placa.',
    location: 'En los puntos de soporte de la bandeja interior.',
    depends: [],
    color: '#b99c5f',
    specifications: {},
  },
  {
    id: 'board-screws',
    name: 'Tornillos de placa',
    category: 'Fijaciones',
    spec: 'Simple Screw · fijación educativa',
    icon: '✚',
    description:
      'Fijan la placa sobre sus separadores. La rosca del recurso es genérica, no una medida comercial certificada.',
    location: 'Sobre los seis soportes de la placa.',
    depends: ['board'],
    color: '#b9c4cf',
    specifications: {},
  },
  {
    id: 'paste',
    name: 'Pasta térmica',
    category: 'Refrigeración',
    spec: 'Aplicación sobre el procesador',
    icon: '●',
    description:
      'Rellena pequeñas irregularidades entre CPU y disipador. La capa aplicada se representa con geometría propia; el envase recibido se muestra durante la aplicación.',
    location: 'Sobre la tapa metálica del procesador, antes del disipador.',
    depends: ['cpu'],
    color: '#bfc4c8',
    specifications: {},
  },
  ...(['fan-top', 'fan-middle', 'fan-bottom', 'fan-rear'] as const).map((id, index) => ({
    id,
    name: [
      'Ventilador frontal superior',
      'Ventilador frontal central',
      'Ventilador frontal inferior',
      'Ventilador trasero',
    ][index],
    category: 'Ventilación',
    spec: '120mm Computer Fans · instalación individual',
    icon: '✺',
    description:
      'Mueve aire a través del gabinete. Se instala con cuatro fijaciones educativas y se conecta por separado a la placa.',
    location:
      index === 3 ? 'En la abertura trasera del gabinete.' : 'En el soporte frontal del gabinete.',
    depends: [],
    color: '#526778',
    specifications: {},
  })),
].map((part) => ({
  ...part,
  position: detailModels[part.id as DetailId].position,
  size: detailModels[part.id as DetailId].size,
})) as Omit<Part, 'asset'>[];
