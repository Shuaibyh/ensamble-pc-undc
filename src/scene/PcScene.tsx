import { Suspense, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import type { ComponentProps } from 'react';
import { PcModelAssembly } from './PcModelAssembly';
import { Lighting } from './Lighting';
import { CameraRig, type CameraCommand } from './CameraRig';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Global3DLoader } from '../components/ui/Global3DLoader';
import { parts } from '../data/catalog';
import '../styles/pcAssembly.css';

const home: [number, number, number] = [2, 1.8, 11.8];
const target: [number, number, number] = [0, -0.8, 0];
const assembledHome: [number, number, number] = [2.6, 1.65, 8.5];
const assembledTarget: [number, number, number] = [0, -0.1, 0];
function PcCamera({ complete, command }: { complete: boolean; command: CameraCommand }) {
  const aspect = useThree((state) => state.size.width / state.size.height);
  const fittedHome = useMemo<[number, number, number]>(() => {
    const base = complete ? assembledHome : home;
    return [base[0], base[1], Math.max(base[2], (complete ? 6.3 : 10.8) / (0.76 * aspect))];
  }, [complete, aspect]);
  return (
    <CameraRig
      smooth
      command={command}
      home={fittedHome}
      target={complete ? assembledTarget : target}
      maxDistance={40}
      frontDistance={Math.max(7.7, 6.3 / (0.76 * aspect))}
    />
  );
}
export default function PcScene({
  cameraCommand,
  ...props
}: ComponentProps<typeof PcModelAssembly> & { cameraCommand: CameraCommand }) {
  const complete = props.assembly.installed.length === parts.length;
  return (
    <ErrorBoundary
      fallback={
        <div className="scene-fallback" role="alert">
          No se pudo cargar el modelo.
          <button className="button" onClick={() => location.reload()}>
            Reintentar
          </button>
          <a href="/">Volver al inicio</a>
        </div>
      }
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: home, fov: 42 }}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Lighting groundY={-4.1} />
        <Suspense
          fallback={
            <Html center>
              <Global3DLoader variant="pc" compact />
            </Html>
          }
        >
          <PcModelAssembly {...props} />
        </Suspense>
        <PcCamera command={cameraCommand} complete={complete} />
      </Canvas>
    </ErrorBoundary>
  );
}
