import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ACESFilmicToneMapping, Group } from 'three';
import { AnimatedSetupCable } from './AnimatedSetupCable';
import { peripherals } from '../data/peripherals';
import { pcPosition, pcScale, setupHome, setupTarget, deskMatPosition } from '../data/setupLayout';
import { setupCables, type SetupCableId } from '../domain/setup';
import type { PartId, CableId } from '../domain/types';
import { Lighting } from './Lighting';
import { PeripheralModel } from './PeripheralModel';
import { PcModelAssembly } from './PcModelAssembly';
import { CameraRig, type CameraCommand } from './CameraRig';
import { Box } from './primitives';
import { MonitorScreen } from './MonitorScreen';
import { SetupAccessory } from './SetupAccessory';

const ready = () => undefined;

function StationCamera({ camera }: { camera: CameraCommand }) {
  const aspect = useThree((state) => state.size.width / state.size.height);
  const home = useMemo<[number, number, number]>(() => {
    const distance = Math.max(1, 1.4 / aspect);
    return [setupHome[0] * distance, setupHome[1] * distance, setupHome[2] * distance];
  }, [aspect]);
  return <CameraRig command={camera} home={home} target={setupTarget} maxDistance={45} />;
}

export default function SetupScene({
  connected,
  powered,
  booted,
  camera,
  installed,
  internalConnected,
  selected,
  onConnect,
  pending,
  onFinish,
  caseClosed,
}: {
  connected: SetupCableId[];
  powered: boolean;
  booted: boolean;
  camera: CameraCommand;
  installed: PartId[];
  internalConnected: CableId[];
  selected: SetupCableId | null;
  onConnect: (id: SetupCableId) => void;
  pending: SetupCableId | null;
  onFinish: () => void;
  caseClosed: boolean;
}) {
  const pcRoot = useRef<Group>(null);
  const monitorRoot = useRef<Group>(null);
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: setupHome, fov: 48 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
    >
      <Lighting groundY={-3.52} fogNear={25} fogFar={55} />
      <Box position={[0.5, -0.1, 0.2]} size={[10, 0.2, 5.6]} color="#33485c" />
      {[-3.9, 4.9].flatMap((x) =>
        [-2, 2.4].map((z) => (
          <Box key={`${x}:${z}`} position={[x, -1.8, z]} size={[0.18, 3.4, 0.18]} color="#202c3c" />
        )),
      )}
      <Box position={[0.5, -0.4, -2]} size={[8.8, 0.3, 0.12]} color="#202c3c" />
      <Box position={[0.5, -3.52, 0.2]} size={[15, 0.04, 11]} color="#101c2b" />
      <Box position={deskMatPosition} size={[5.8, 0.025, 1.8]} color="#182432" />
      <Suspense
        fallback={
          <Html position={pcPosition} center>
            <span className="resource-message" role="status">
              Preparando tu PC…
            </span>
          </Html>
        }
      >
        <group ref={pcRoot} position={pcPosition} scale={pcScale}>
          <PcModelAssembly
            assembly={{ installed, connected: internalConnected, powered }}
            selected="standoffs"
            busy={null}
            highlight={false}
            panelVisible={caseClosed}
            showPoints={false}
            displayOnly
            onSelect={ready}
            onFinish={ready}
            onToggleCable={ready}
          />
        </group>
      </Suspense>
      {Object.values(peripherals).map((peripheral) => (
        <group
          key={peripheral.path}
          ref={peripheral === peripherals.monitor ? monitorRoot : undefined}
        >
          <PeripheralModel {...peripheral} />
        </group>
      ))}
      <Suspense fallback={null}>
        <MonitorScreen powered={powered} booted={booted} />
      </Suspense>
      <SetupAccessory
        name="regleta de corriente"
        path="/models/assembly-details/power-strip.glb"
        axis="x"
        length={0.92}
        rotation={[0, Math.PI, 0]}
        position={[-2.95, 0.08, -1.95]}
        fallbackSize={[0.86, 0.12, 0.3]}
        fallbackColor="#ced6df"
        includePrefixes={[
          'connector_strip_white',
          'connector_strip_gold',
          'connector_strip_plug_hole',
          'connector_strip_switch',
          'switch_switch',
        ]}
      />
      {setupCables.map(({ id }) => {
        const attached = connected.includes(id) || pending === id;
        return (
          <AnimatedSetupCable
            key={id}
            id={id}
            animate={pending === id}
            attached={attached}
            selected={selected === id}
            onConnect={() => onConnect(id)}
            onFinish={onFinish}
            pcRoot={pcRoot}
            monitorRoot={monitorRoot}
          />
        );
      })}
      <StationCamera camera={camera} />
    </Canvas>
  );
}
