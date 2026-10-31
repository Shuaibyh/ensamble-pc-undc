export type FanId = 'fan1' | 'fan2' | 'fan3';

export interface FanDefinition {
  id: FanId;
  name: string;
  modelPath: string;
  rotorName: string;
  target: readonly [number, number, number];
  tray: readonly [number, number, number];
}

const modelBase = '/models/fans-argb-beta';

export const fanScale = 6;

export const fanDefinitions: readonly FanDefinition[] = [
  {
    id: 'fan1',
    name: 'Ventilador frontal 1',
    modelPath: `${modelBase}/UNDC_FAN_FRONTAL_01_ARGB_v08.glb`,
    rotorName: 'UNDC_FAN_V08_01_ROTOR_ANIMABLE',
    target: [0, 0.106 * fanScale, 0.196 * fanScale],
    tray: [2.05, 0.68, 1.35],
  },
  {
    id: 'fan2',
    name: 'Ventilador frontal 2',
    modelPath: `${modelBase}/UNDC_FAN_FRONTAL_02_ARGB_v08.glb`,
    rotorName: 'UNDC_FAN_V08_02_ROTOR_ANIMABLE',
    target: [0, 0.226 * fanScale, 0.196 * fanScale],
    tray: [2.05, 1.4, 1.35],
  },
  {
    id: 'fan3',
    name: 'Ventilador frontal 3',
    modelPath: `${modelBase}/UNDC_FAN_FRONTAL_03_ARGB_v08.glb`,
    rotorName: 'UNDC_FAN_V08_03_ROTOR_ANIMABLE',
    target: [0, 0.346 * fanScale, 0.196 * fanScale],
    tray: [2.05, 2.12, 1.35],
  },
] as const;

export const fanCasePath = `${modelBase}/UNDC_GABINETE_SIN_FANS_v08.glb`;
export const fanScrewPath = `${modelBase}/UNDC_TORNILLO_FAN_TIPO_v08.glb`;

export const screwOffsets = [
  [-0.0525 * fanScale, -0.0525 * fanScale, 0.013 * fanScale],
  [-0.0525 * fanScale, 0.0525 * fanScale, 0.013 * fanScale],
  [0.0525 * fanScale, -0.0525 * fanScale, 0.013 * fanScale],
  [0.0525 * fanScale, 0.0525 * fanScale, 0.013 * fanScale],
] as const;

export const emptyScrews = (): Record<FanId, boolean[]> => ({
  fan1: [false, false, false, false],
  fan2: [false, false, false, false],
  fan3: [false, false, false, false],
});
