import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../domain/types';
export function Box({
  position = [0, 0, 0],
  size,
  color = '#657387',
  glow = false,
}: {
  position?: Vec3;
  size: Vec3;
  color?: string;
  glow?: boolean;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={0.18}
        roughness={0.65}
        emissive={glow ? color : '#000'}
        emissiveIntensity={glow ? 0.8 : 0}
      />
    </mesh>
  );
}
export function Fan({
  position,
  radius = 0.34,
  powered = false,
}: {
  position: Vec3;
  radius?: number;
  powered?: boolean;
}) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current && powered) blades.current.rotation.z -= dt * 8;
  });
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[radius, 0.025, 8, 40]} />
        <meshStandardMaterial
          color={powered ? '#55d5ff' : '#597893'}
          emissive={powered ? '#258ace' : '#000'}
          emissiveIntensity={1}
        />
      </mesh>
      <group ref={blades}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
            <Box
              position={[radius * 0.4, 0, 0]}
              size={[radius * 0.9, 0.09, 0.03]}
              color="#667b90"
            />
          </group>
        ))}
      </group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.05, 20]} />
        <meshStandardMaterial color="#a2b5c9" />
      </mesh>
    </group>
  );
}
