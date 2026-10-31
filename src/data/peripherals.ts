import type { Vec3 } from '../domain/types';

export const peripherals = {
  monitor: {
    name: 'Monitor',
    path: '/models/peripherals/monitor.glb',
    author: 'portgl16',
    source: 'https://skfb.ly/onBo6',
    axis: 'x' as const,
    length: 4.1,
    exclude: ['Cube_RenderMonitor_0'],
    rotation: [0, 0, 0] as Vec3,
    position: [-1, 0, -1.3] as Vec3,
  },
  keyboard: {
    name: 'Teclado mecánico',
    path: '/models/peripherals/keyboard.glb',
    author: 'FelikinRuslan',
    source: 'https://skfb.ly/6R68t',
    axis: 'x' as const,
    length: 3.34,
    exclude: ['wire', 'usb'],
    rotation: [0, 0, 0] as Vec3,
    position: [-1, 0.04, 1.4] as Vec3,
  },
  mouse: {
    name: 'Mouse',
    path: '/models/peripherals/mouse.glb',
    author: 'LagzDesign',
    source: 'https://skfb.ly/oWQYs',
    axis: 'z' as const,
    length: 0.91,
    exclude: [],
    rotation: [0, Math.PI / 2, 0] as Vec3,
    position: [1.35, 0.04, 1.4] as Vec3,
  },
};
