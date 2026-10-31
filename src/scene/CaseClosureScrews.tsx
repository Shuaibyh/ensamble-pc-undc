import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import type { Vec3 } from '../domain/types';
import { prepareAssemblyModel } from './prepareAssemblyModel';
import { ScrewPlacement } from './ScrewPlacement';

const positions: Vec3[] = [
  [-2.08, 1.92, 1.18],
  [2.08, 1.92, 1.18],
  [-2.08, -1.92, 1.18],
  [2.08, -1.92, 1.18],
];

export function CaseClosureScrews({
  positions: placements = positions,
  pending = false,
  onComplete,
  onCancel,
  onActivity,
}: {
  positions?: Vec3[];
  pending?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  onActivity?: (active: boolean) => void;
}) {
  const { scene } = useGLTF('/models/assembly-details/screw.glb', false, false);
  const screw = useMemo(
    () =>
      prepareAssemblyModel(scene, {
        path: '/models/assembly-details/screw.glb',
        rotation: [0, -Math.PI / 2, 0],
        referenceAxis: 'z',
        referenceLength: 0.13,
        position: [0, 0, 0],
        size: [0.13, 0.13, 0.13],
      }),
    [scene],
  );

  const fasteners = useMemo(
    () =>
      placements.map((position) => {
        const object = screw.clone(true);
        object.position.set(...position);
        const root = new Group();
        root.add(object);
        return root;
      }),
    [placements, screw],
  );
  if (pending && onComplete)
    return (
      <ScrewPlacement
        name="Fijación del panel del gabinete"
        fasteners={fasteners}
        axis="z"
        onComplete={onComplete}
        onCancel={onCancel}
        onActivity={onActivity}
      />
    );
  return (
    <group dispose={null}>
      {fasteners.map((object, index) => (
        <primitive key={index} object={object} />
      ))}
    </group>
  );
}
