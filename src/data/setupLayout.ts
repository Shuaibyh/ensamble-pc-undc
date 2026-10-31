import type { SetupCableId } from '../domain/setup';
import type { Vec3 } from '../domain/types';
import targets from './pcTargets.json';

export const setupHome: Vec3 = [9, 6.4, 12.8];
export const pcScale = 0.68;
// Same normalized cREAgal chassis, resting on the desk with its original materials.
export const pcPosition: Vec3 = [
  3.65,
  -(targets.chassis.position[1] - targets.chassis.size[1] / 2) * pcScale + 0.015,
  -0.5,
];
export const setupTarget: Vec3 = [0.5, 0.55, 0];
export const deskMatPosition: Vec3 = [-0.65, 0.006, 1.35];
export const pcRearX =
  pcPosition[0] + (targets.chassis.position[0] - targets.chassis.size[0] / 2) * pcScale;
// Free-span waypoints only. Device endpoints and tangents come from the live
// GLB socket frames and cableExitAnchor, never from chassis bounds or offsets.
export const setupRoutes: Record<SetupCableId, Vec3[]> = {
  'pc-power': [
    [1.2, 0.42, -1.72],
    [0.35, 0.18, -2.34],
    [-2.75, 0.14, -2.28],
    [-3.04, 0.208, -1.95],
  ],
  'keyboard-usb': [
    [-1, 0.17, 0.9],
    [-1, 0.14, 0.5],
    [-0.7, 0.13, -0.3],
    [0.35, 0.2, -1.72],
  ],
  'mouse-usb': [
    [1.35, 0.17, 0.945],
    [1.35, 0.14, 0.55],
    [1.62, 0.14, -0.12],
    [1.58, 0.24, -1.5],
  ],
  video: [
    [0.05, 0.35, -2.12],
    [1.05, 0.27, -2.02],
  ],
  'monitor-power': [
    [0.35, 0.42, -2.3],
    [-1.82, 0.16, -2.35],
    [-2.55, 0.16, -2.2],
    [-2.825, 0.208, -1.95],
  ],
};
export const setupPortNames: Record<SetupCableId, string> = {
  'pc-power': 'Toma de alimentación de la PC',
  'keyboard-usb': 'USB 1 · teclado',
  'mouse-usb': 'USB 2 · mouse',
  video: 'DisplayPort · tarjeta gráfica',
  'monitor-power': 'Toma de alimentación del monitor',
};
