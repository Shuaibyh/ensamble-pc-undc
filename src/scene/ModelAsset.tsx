import { Suspense, type ReactNode } from 'react';
import { Clone, Html, useGLTF } from '@react-three/drei';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Global3DLoader } from '../components/ui/Global3DLoader';
import type { ModelAsset as Asset } from '../domain/types';

function LoadedModel({ asset }: { asset: Asset }) {
  // Sin precarga: se solicita el archivo únicamente al montar la pieza.
  // Los GLB del proyecto deben estar sin Draco para no necesitar decodificadores remotos.
  const { scene } = useGLTF(asset.modelPath!, false, false);
  return (
    <group scale={asset.scale} rotation={asset.rotation}>
      <group position={asset.anchor.map((value) => -value) as [number, number, number]}>
        <Clone object={scene} castShadow receiveShadow />
      </group>
    </group>
  );
}

export function ModelAsset({
  asset,
  name,
  fallback,
}: {
  asset: Asset;
  name: string;
  fallback: ReactNode;
}) {
  if (!asset.modelPath) return fallback;
  return (
    <ErrorBoundary
      key={asset.modelPath}
      fallback={
        <>
          {fallback}
          <Html position={[0, 0.6, 0]} center>
            <span className="resource-message" role="alert">
              No se pudo cargar {name}. Se usa el modelo provisional.
            </span>
          </Html>
        </>
      }
    >
      <Suspense
        fallback={
          <>
            {fallback}
            <Html center>
              <Global3DLoader variant="model" status={`Cargando ${name}...`} compact />
            </Html>
          </>
        }
      >
        <LoadedModel asset={asset} />
      </Suspense>
    </ErrorBoundary>
  );
}
