import { Suspense, useMemo } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import type { Vec3 } from '../domain/types';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { preparePeripheralModel } from './preparePeripheralModel';
import { Box } from './primitives';

interface SetupAccessoryProps {
  name: string;
  path: string;
  axis: 'x' | 'y' | 'z';
  length: number;
  rotation: Vec3;
  position: Vec3;
  fallbackSize: Vec3;
  fallbackColor: string;
  exclude?: readonly string[];
  includePrefixes?: readonly string[];
}

function LoadedAccessory(props: SetupAccessoryProps) {
  const { scene } = useGLTF(props.path, false, false);
  const object = useMemo(
    () =>
      preparePeripheralModel(
        scene,
        props.axis,
        props.length,
        props.rotation,
        props.exclude,
        props.includePrefixes,
      ),
    [scene, props.axis, props.length, props.rotation, props.exclude, props.includePrefixes],
  );

  return (
    <group position={props.position}>
      <primitive object={object} />
    </group>
  );
}

export function SetupAccessory(props: SetupAccessoryProps) {
  const fallback = (
    <Box position={props.position} size={props.fallbackSize} color={props.fallbackColor} />
  );

  return (
    <ErrorBoundary
      fallback={
        <>
          {fallback}
          <Html position={props.position} center>
            <span className="resource-message">No se pudo cargar {props.name}.</span>
          </Html>
        </>
      }
    >
      <Suspense fallback={fallback}>
        <LoadedAccessory {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
