import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as Controls } from 'three-stdlib';
import type { Vec3 } from '../domain/types';
import { Vector3 } from 'three';

export interface CameraCommand {
  action: 'reset' | 'front' | 'focus' | 'in' | 'out' | 'left' | 'right';
  sequence: number;
  target: Vec3;
}
export const initialCamera: Vec3 = [2.6, 1.65, 7.8];
const defaultTarget: Vec3 = [0, -0.1, 0];
export function CameraRig({
  command,
  home = initialCamera,
  target = defaultTarget,
  maxDistance = 18,
  frontDistance = 7.7,
  smooth = false,
}: {
  command: CameraCommand;
  home?: Vec3;
  target?: Vec3;
  maxDistance?: number;
  frontDistance?: number;
  smooth?: boolean;
}) {
  const controls = useRef<Controls>(null);
  const { camera } = useThree();
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  useFrame((_, delta) => {
    if (!goal.current || !controls.current) return;
    const t = 1 - Math.exp(-Math.min(delta, 0.05) * 9);
    camera.position.lerp(goal.current.position, t);
    controls.current.target.lerp(goal.current.target, t);
    controls.current.update();
    if (camera.position.distanceTo(goal.current.position) < 0.005) goal.current = null;
  });
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    goal.current = null;
    if (smooth && ['reset', 'focus', 'front'].includes(command.action)) {
      const center = new Vector3(
        ...(command.action === 'focus'
          ? command.target
          : command.action === 'front'
            ? ([0, 0.15, 0] as Vec3)
            : target),
      );
      const position =
        command.action === 'focus'
          ? center.clone().add(new Vector3(0, 0.2, 6.3))
          : command.action === 'front'
            ? new Vector3(0, 0.15, frontDistance)
            : new Vector3(...home);
      goal.current = { position, target: center };
      return;
    }
    if (command.action === 'reset') {
      camera.position.set(...home);
      orbit.target.set(...target);
    }
    if (command.action === 'focus') {
      orbit.target.set(...command.target);
      camera.position.set(
        command.target[0] - 1.4,
        command.target[1] + 0.9,
        command.target[2] + 4.8,
      );
    }
    if (command.action === 'front') {
      camera.position.set(0, 0.15, frontDistance);
      orbit.target.set(0, 0.15, 0);
    }
    // OrbitControls aplica el factor desde el objetivo de la cámara.
    if (command.action === 'in') orbit.dollyIn(1 / 1.2);
    if (command.action === 'out') orbit.dollyOut(1 / 1.2);
    if (command.action === 'left') orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - 0.3);
    if (command.action === 'right') orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + 0.3);
    orbit.update();
  }, [camera, command, home, target, frontDistance, smooth]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      onStart={() => {
        goal.current = null;
      }}
      target={target}
      minDistance={3}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI * 0.85}
      enableDamping
    />
  );
}
