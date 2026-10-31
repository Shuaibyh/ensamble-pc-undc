import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { SRGBColorSpace, type MeshBasicMaterial } from 'three';

export function MonitorScreen({ powered, booted }: { powered: boolean; booted: boolean }) {
  const texture = useTexture('/images/windows11-monitor.png');
  texture.colorSpace = SRGBColorSpace;
  const screen = useRef<MeshBasicMaterial>(null);
  const brightness = useRef(0);
  useFrame((_, delta) => {
    if (!screen.current) return;
    const visible = powered && booted;
    brightness.current = visible
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 1
        : Math.min(1, brightness.current + delta * 2)
      : 0;
    screen.current.color.setScalar(brightness.current);
  });
  return (
    <mesh position={[-1, 1.724, -1.036]}>
      <planeGeometry args={[3.971, 2.287]} />
      <meshBasicMaterial ref={screen} map={texture} color="#000000" toneMapped={false} />
    </mesh>
  );
}
