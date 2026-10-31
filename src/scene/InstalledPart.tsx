import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Part } from '../domain/types';
import { IntegratedPart } from './IntegratedPart';

export function InstalledPart({
  part,
  powered,
  animate,
  onSelect,
  onFinish,
}: {
  part: Part;
  powered: boolean;
  animate: boolean;
  onSelect: () => void;
  onFinish: () => void;
}) {
  const group = useRef<Group>(null);
  const progress = useRef(animate ? 0 : 1);
  const ready = useRef(false);
  const onReady = useCallback(() => {
    ready.current = true;
  }, []);
  useFrame((_, delta) => {
    if (progress.current >= 1 || !group.current) return;
    if (!animate) {
      progress.current = 1;
      group.current.position.z = part.position[2];
      return;
    }
    if (!ready.current) return;
    progress.current = Math.min(1, progress.current + delta / (part.id === 'paste' ? 1.8 : 0.75));
    group.current.position.z = part.position[2] + 1.8 * (1 - progress.current) ** 3;
    if (progress.current >= 1) onFinish();
  });
  return (
    <group
      ref={group}
      position={[part.position[0], part.position[1], part.position[2] + (animate ? 1.8 : 0)]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <IntegratedPart part={part} powered={powered} onReady={onReady} animate={animate} />
    </group>
  );
}
