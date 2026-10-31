import { Quaternion, Vector3 } from 'three';

export const rotationStep = Math.PI / 12;
export function alignment(
  position: Vector3,
  target: Vector3,
  rotation: Quaternion,
  targetRotation: Quaternion,
  tolerance: number,
) {
  // Never discard depth: pieces on another surface cannot be considered aligned.
  const distance = position.distanceTo(target);
  const angleError = rotation.angleTo(targetRotation);
  return {
    positionOk: distance <= tolerance,
    orientationOk: angleError < 0.06,
    distance,
    angleError,
  };
}

export function allFastenersPlaced(count: number, placed: readonly number[]) {
  return count > 0 && Array.from({ length: count }, (_, i) => i).every((i) => placed.includes(i));
}
