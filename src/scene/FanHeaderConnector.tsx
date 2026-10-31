import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { prepareAssemblyModel } from './prepareAssemblyModel';
import { Box } from './primitives';

function LoadedConnector() {
  const { scene } = useGLTF('/models/assembly-details/fan-header.glb', false, false);
  const object = useMemo(
    () =>
      prepareAssemblyModel(scene, {
        path: '',
        rotation: [0, 0, 0],
        referenceAxis: 'z',
        referenceLength: 0.14,
        position: [0, 0, 0],
        size: [0.1, 0.06, 0.14],
      }),
    [scene],
  );
  return <primitive object={object} />;
}

export function FanHeaderConnector() {
  const fallback = <Box size={[0.1, 0.06, 0.14]} color="#ded9c9" />;
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedConnector />
      </Suspense>
    </ErrorBoundary>
  );
}
