import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { parts } from '../data/catalog';
import type { Assembly } from '../domain/assembly';
import type { PartId, CableId, Vec3 } from '../domain/types';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { CameraRig, initialCamera, type CameraCommand } from './CameraRig';
import { Lighting } from './Lighting';
import { AssemblyCase } from './AssemblyCase';
import { InstalledPart } from './InstalledPart';
import { Connections } from './Connections';

interface Props {
  assembly: Assembly;
  selected: PartId;
  highlight: boolean;
  busy: PartId | null;
  panelVisible: boolean;
  showPoints: boolean;
  cameraCommand: CameraCommand;
  onSelect: (id: PartId) => void;
  onToggleCable: (id: CableId) => void;
  onFinish: (id: PartId) => void;
}
export default function Scene({
  assembly,
  selected,
  highlight,
  busy,
  panelVisible,
  showPoints,
  cameraCommand,
  onSelect,
  onToggleCable,
  onFinish,
}: Props) {
  const part = parts.find((item) => item.id === selected)!;
  return (
    <ErrorBoundary
      fallback={
        <div className="scene-fallback" role="alert">
          No se pudo iniciar el visor 3D. Activa la aceleración de hardware y recarga la página. Los
          paneles siguen disponibles.
        </div>
      }
    >
      <Canvas
        shadows="percentage"
        dpr={[1, 1.5]}
        camera={{ position: initialCamera, fov: 38 }}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        fallback={
          <div className="scene-fallback">
            Tu navegador no permite WebGL. Usa un navegador con aceleración de hardware.
          </div>
        }
      >
        <Lighting />
        <AssemblyCase powered={assembly.powered} panelVisible={panelVisible} />
        {parts
          .filter((item) => assembly.installed.includes(item.id))
          .map((item) => (
            <InstalledPart
              key={item.id}
              part={item}
              powered={assembly.powered}
              animate={busy === item.id}
              onFinish={() => onFinish(item.id)}
              onSelect={() => {
                if (!busy) onSelect(item.id);
              }}
            />
          ))}
        {highlight && (
          <group position={part.position}>
            <mesh>
              <boxGeometry args={part.size.map((value) => value + 0.09) as Vec3} />
              <meshBasicMaterial color="#96c6ff" wireframe depthTest={false} />
            </mesh>
            <Html
              position={[0, part.size[1] / 2 + 0.2, 0.25]}
              center
              style={{ pointerEvents: 'none' }}
            >
              <span className="scene-label">{part.name}</span>
            </Html>
          </group>
        )}
        <Connections
          assembly={assembly}
          disabled={!!busy || assembly.powered}
          showPoints={showPoints && !panelVisible}
          onToggle={onToggleCable}
        />
        {assembly.installed.length === parts.length && !panelVisible && (
          <Html position={[1.25, -1.72, 0.15]} center style={{ pointerEvents: 'none' }}>
            <span className="airflow-label">Zona libre para entrada de aire</span>
          </Html>
        )}
        <CameraRig command={cameraCommand} />
      </Canvas>
    </ErrorBoundary>
  );
}
