import type { Vec3 } from './types';

/** Últimos centímetros de inserción: clavija y extremo del cable se desplazan juntos. */
export function connectionEndpoint(target: Vec3, progress: number, normal: Vec3): Vec3 {
  const t = Math.max(0, Math.min(1, progress));
  const distance = 0.38 * (1 - t) ** 3;
  return target.map((value, index) => value + normal[index] * distance) as Vec3;
}
