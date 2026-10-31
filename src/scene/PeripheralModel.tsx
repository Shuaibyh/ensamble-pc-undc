import { Suspense, useMemo } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { preparePeripheralModel } from './preparePeripheralModel';
import type { Vec3 } from '../domain/types';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Global3DLoader } from '../components/ui/Global3DLoader';

interface Props {
  name: string;
  path: string;
  axis: 'x' | 'y' | 'z';
  length: number;
  rotation: Vec3;
  position: Vec3;
  exclude?: readonly string[];
}

function Loaded(props: Props) {
  const { scene } = useGLTF(props.path, false, false);
  const object = useMemo(
    () => preparePeripheralModel(scene, props.axis, props.length, props.rotation, props.exclude),
    [scene, props.axis, props.length, props.rotation, props.exclude],
  );
  return (
    <group position={props.position}>
      <primitive object={object} />
    </group>
  );
}

export function PeripheralModel(props: Props) {
  return (
    <ErrorBoundary
      fallback={
        <Html center>
          <span className="resource-message">No se pudo cargar {props.name}.</span>
        </Html>
      }
    >
      <Suspense
        fallback={
          <Html center>
            <Global3DLoader variant="model" status={`Cargando ${props.name}...`} compact />
          </Html>
        }
      >
        <Loaded {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
