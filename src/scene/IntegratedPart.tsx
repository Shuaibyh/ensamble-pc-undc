import { Suspense, useEffect, useMemo } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { assemblyModels } from '../data/assemblyModels';
import type { Part } from '../domain/types';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Global3DLoader } from '../components/ui/Global3DLoader';
import { prepareDetailedPart } from './prepareDetailedPart';
import { ProceduralPart } from './ProceduralPart';

function LoadedPart({
  part,
  onReady,
  powered,
  animate,
}: {
  part: Part;
  onReady: () => void;
  powered: boolean;
  animate: boolean;
}) {
  const definition = assemblyModels[part.id];
  const { scene } = useGLTF(definition.path, false, false);
  const prepared = useMemo(() => prepareDetailedPart(scene, part.id), [scene, part.id]);
  const rotor = useMemo(() => prepared.getObjectByName('rotor-educativo'), [prepared]);
  useFrame((_, delta) => {
    if (powered && rotor) rotor.rotation.x += delta * 6;
  });
  useEffect(onReady, [onReady]);
  if (part.id === 'paste')
    return (
      <>
        <mesh>
          <boxGeometry args={[0.28, 0.28, 0.009]} />
          <meshStandardMaterial color="#bfc4c8" roughness={0.85} />
        </mesh>
        {animate && (
          <group position={[0.6, 0.3, 0.45]}>
            <primitive object={prepared} />
          </group>
        )}
      </>
    );
  return <primitive object={prepared} />;
}

function FallbackPart({
  part,
  powered,
  onReady,
}: {
  part: Part;
  powered: boolean;
  onReady: () => void;
}) {
  useEffect(onReady, [onReady]);
  return <ProceduralPart part={part} powered={powered} />;
}

export function IntegratedPart({
  part,
  powered,
  onReady,
  animate = false,
}: {
  part: Part;
  powered: boolean;
  onReady: () => void;
  animate?: boolean;
}) {
  return (
    <ErrorBoundary
      fallback={
        <>
          <FallbackPart part={part} powered={powered} onReady={onReady} />
          <Html center>
            <span className="resource-message">
              Error al cargar {part.name}. Representación provisional.
            </span>
          </Html>
        </>
      }
    >
      <Suspense
        fallback={
          <Html center>
            <Global3DLoader variant="model" status={`Cargando ${part.name}...`} compact />
          </Html>
        }
      >
        <LoadedPart part={part} onReady={onReady} powered={powered} animate={animate} />
      </Suspense>
    </ErrorBoundary>
  );
}
