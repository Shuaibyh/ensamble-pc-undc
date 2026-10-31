import { chassis } from '../data/catalog';
import { Box } from './primitives';
import { ModelAsset } from './ModelAsset';

function Frame({ powered }: { powered: boolean }) {
  return (
    <group>
      <Box position={[0, 0, -0.92]} size={[3.05, 4.15, 0.1]} color="#c0d2e4" />
      <Box position={[0, -2.06, 0]} size={[3.12, 0.12, 1.95]} color="#8295aa" />
      <Box position={[0, 2.06, 0]} size={[3.12, 0.12, 1.95]} color="#8295aa" />
      <Box position={[1.5, 0, 0]} size={[0.1, 4.15, 1.95]} color="#6f8398" />
      <Box position={[-1.5, 0, -0.45]} size={[0.1, 4.15, 0.9]} color="#73879d" />

      <Box position={[-0.7, 0.57, -0.84]} size={[2.65, 3.18, 0.035]} color="#d5e0ea" />
      <Box position={[0, -1.03, -0.62]} size={[2.92, 0.06, 0.42]} color="#9fb0c2" />
      <Box position={[-0.45, -1.52, -0.56]} size={[1.76, 0.78, 0.06]} color="#9cb0c4" />
      <Box position={[-1.48, 1.25, -0.1]} size={[0.035, 1.32, 1.08]} color="#8da0b5" />
      <Box position={[1.5, 0.2, 0.55]} size={[0.05, 3.58, 0.12]} color="#8da0b5" />

      {[-1.5, 1.5].map((x) => (
        <Box key={x} position={[x, 0, 0.93]} size={[0.07, 4.15, 0.07]} color="#b6c3d0" />
      ))}
      {[-1.05, 1.05].map((x) => (
        <Box key={x} position={[x, -2.2, 0]} size={[0.4, 0.22, 1.2]} color="#52677d" />
      ))}
      <Box
        position={[1.56, 1.7, 0.5]}
        size={[0.025, 0.09, 0.2]}
        color={powered ? '#54efb1' : '#aac2d1'}
        glow={powered}
      />
    </group>
  );
}

export function Chassis({ powered, panelVisible }: { powered: boolean; panelVisible: boolean }) {
  return (
    <group>
      <ModelAsset
        asset={chassis.asset}
        name={chassis.name}
        fallback={<Frame powered={powered} />}
      />
      {panelVisible && (
        <mesh position={[0, 0, 0.97]}>
          <boxGeometry args={[2.97, 4.02, 0.05]} />
          <meshStandardMaterial
            color="#8cc8f0"
            transparent
            opacity={0.32}
            roughness={0.2}
            metalness={0.05}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
