import { Suspense, useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { CatmullRomCurve3, Group, Vector3 } from 'three';
import type { Assembly } from '../domain/assembly';
import type { Part, PartId, CableId, Vec3 } from '../domain/types';
import { parts, cables } from '../data/catalog';
import { pcModel, type PcGroupId } from '../data/pcModel';
import { preparePcModel } from './preparePcModel';
import { IntegratedPart } from './IntegratedPart';
import { CaseClosureScrews } from './CaseClosureScrews';
import { Box } from './primitives';
import { FanHeaderConnector } from './FanHeaderConnector';
import targets from '../data/pcTargets.json';
import { ManualPlacement } from './ManualPlacement';
import { fastenersFrom } from './manualGeometry';
import { installIssues } from '../domain/assembly';

const cableColors: Partial<Record<CableId, string>> = {
  'sata-power': '#403c44',
  'cpu-fan': '#ff75bd',
  'fan-rear': '#55e6bd',
};

function ProceduralCable({ cable, powered }: { cable: (typeof cables)[number]; powered: boolean }) {
  const fanCable = cable.id === 'cpu-fan' || cable.id === 'fan-rear';
  const color = cableColors[cable.id] ?? '#303842';
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        cable.points.map((point) => new Vector3(...point)),
        false,
        'centripetal',
        0.45,
      ),
    [cable.points],
  );
  const strands = fanCable ? [0] : [-0.026, 0, 0.026];
  const start = cable.points[0];
  const end = cable.points.at(-1)!;
  return (
    <group>
      {strands.map((offset) => (
        <mesh key={offset} position={[offset, 0, 0]}>
          <tubeGeometry args={[curve, 72, fanCable ? 0.032 : 0.02, 8, false]} />
          <meshStandardMaterial
            color={color}
            emissive={powered ? color : '#000000'}
            emissiveIntensity={powered ? 0.12 : 0}
            roughness={0.72}
          />
        </mesh>
      ))}
      <group position={start} rotation={[0, Math.PI / 2, 0]}>
        <Box size={fanCable ? [0.12, 0.085, 0.1] : [0.24, 0.15, 0.13]} color="#202936" />
      </group>
      <group position={end}>
        {fanCable ? <FanHeaderConnector /> : <Box size={[0.28, 0.16, 0.12]} color="#202936" />}
      </group>
    </group>
  );
}

const closurePositions: Vec3[] = [-1, 1].flatMap((x) =>
  [-1, 1].map(
    (y) =>
      [
        targets.chassis.position[0] + x * (targets.chassis.size[0] / 2 - 0.18),
        targets.chassis.position[1] + y * (targets.chassis.size[1] / 2 - 0.18),
        targets.chassis.size[2] / 2 + 0.035,
      ] as Vec3,
  ),
);
// Compact workbench cells. Final transforms never come from this display layout.
const workbench: Partial<Record<PartId, Vec3>> = {
  board: [-4.1, 1.1, 0],
  ram: [-4.1, -0.8, 0],
  cpu: [-4.1, -2.1, 0],
  psu: [4.1, 1.3, 0],
  gpu: [4.1, -0.4, 0],
  ssd: [4.1, -1.9, 0],
  cooler: [-1.8, -3.3, 0],
  'fan-rear': [1.8, -3.3, 0],
};

function Piece({
  object,
  part,
  installed,
  animate,
  selected,
  onSelect,
  onFinish,
}: {
  object?: Group;
  part: Part;
  installed: boolean;
  animate: boolean;
  selected: boolean;
  onSelect: () => void;
  onFinish: () => void;
}) {
  const ref = useRef<Group>(null);
  const progress = useRef(0);
  const finished = useRef(false);
  const ready = useRef(part.id !== 'paste');
  const onReady = useCallback(() => {
    ready.current = true;
  }, []);
  const tray = workbench[part.id] ?? [0, -3.3, 1.4];
  const displayScale = workbench[part.id] ? Math.min(0.8, 1.6 / Math.max(...part.size)) : 0.5;
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (animate && ready.current)
      progress.current = Math.min(1, progress.current + delta / (part.id === 'paste' ? 1.8 : 0.6));
    else if (!animate) {
      progress.current = installed ? 1 : 0;
      finished.current = false;
    }
    const t = progress.current;
    const eased = t * t * (3 - 2 * t);
    const scale = displayScale + (1 - displayScale) * eased;
    ref.current.scale.setScalar(scale);
    ref.current.position.set(
      (tray[0] - part.position[0] * displayScale) * (1 - eased),
      (tray[1] - part.position[1] * displayScale) * (1 - eased),
      (tray[2] - part.position[2] * displayScale) * (1 - eased) + Math.sin(Math.PI * t) * 1.2,
    );
    if (animate && t === 1 && !finished.current) {
      finished.current = true;
      onFinish();
    }
  });
  if (!installed && !animate && !workbench[part.id] && !selected) return null;
  return (
    <group
      ref={ref}
      dispose={null}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {object ? (
        <primitive object={object} />
      ) : (
        <group position={part.position}>
          <IntegratedPart
            part={part}
            powered={false}
            onReady={onReady}
            animate={animate || !installed}
          />
        </group>
      )}
      {!installed && selected && (
        <Html
          position={[
            part.position[0],
            part.position[1] - part.size[1] / 2 - 0.25,
            part.position[2],
          ]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <span className="scene-label">{part.name}</span>
        </Html>
      )}
    </group>
  );
}

export function PcModelAssembly({
  assembly,
  selected,
  busy,
  highlight,
  panelVisible,
  showPoints,
  onSelect,
  onFinish,
  onToggleCable,
  displayOnly = false,
  dragEnabled = false,
  onManualComplete,
  onManualActivity,
  closurePending = false,
  onClosureComplete,
  onClosureCancel,
}: {
  assembly: Assembly;
  selected: PartId;
  busy: PartId | null;
  highlight: boolean;
  panelVisible: boolean;
  showPoints: boolean;
  onSelect: (id: PartId) => void;
  onFinish: (id: PartId) => void;
  onToggleCable: (id: CableId) => void;
  displayOnly?: boolean;
  dragEnabled?: boolean;
  onManualComplete?: (ids: PartId[]) => void;
  onManualActivity?: (active: boolean) => void;
  closurePending?: boolean;
  onClosureComplete?: () => void;
  onClosureCancel?: () => void;
}) {
  const { scene } = useGLTF(pcModel.path, false, true);
  const { groups, cover } = useMemo(() => preparePcModel(scene), [scene]);
  const part = parts.find((p) => p.id === selected)!;
  const manualObject = useMemo(
    () => groups[selected as PcGroupId]?.clone(true),
    [groups, selected],
  );
  // Cooler follows the CPU socket normal, not the shortest side of its radiator.
  // Other pieces use their measured thin face (RAM/fan X, GPU/SSD/PSU Y, board/CPU Z).
  const rotationAxis = useMemo(
    () => (selected === 'cooler' ? new Vector3(0, 0, 1) : undefined),
    [selected],
  );
  const screws = useMemo(() => fastenersFrom(groups['board-screws'], true), [groups]);
  const manual =
    (dragEnabled || selected === 'board-screws') &&
    !displayOnly &&
    !panelVisible &&
    !busy &&
    !assembly.powered;
  return (
    <group dispose={null}>
      <primitive object={groups.chassis} />
      {parts
        .filter(
          (p) =>
            (!displayOnly || assembly.installed.includes(p.id)) &&
            (!manual || assembly.installed.includes(p.id) || p.id === 'paste'),
        )
        .map((p) => (
          <Piece
            key={p.id}
            object={groups[p.id as PcGroupId]}
            part={p}
            installed={assembly.installed.includes(p.id)}
            animate={busy === p.id}
            selected={selected === p.id}
            onSelect={() => {
              if (!displayOnly && !busy) onSelect(p.id);
            }}
            onFinish={() => onFinish(p.id)}
          />
        ))}
      {manual && manualObject && !assembly.installed.includes(selected) && (
        <ManualPlacement
          key={selected}
          object={manualObject}
          token={'pc:' + selected}
          name={part.name}
          axis="z"
          rotationAxis={rotationAxis}
          blocked={installIssues(assembly, selected).join(' ')}
          fasteners={selected === 'board' || selected === 'board-screws' ? screws : undefined}
          fastenersOnly={selected === 'board-screws'}
          onActivity={(active) => onManualActivity?.(active)}
          onComplete={() =>
            onManualComplete?.(selected === 'board' ? ['board', 'board-screws'] : [selected])
          }
        />
      )}
      {highlight && !panelVisible && !manual && (
        <mesh position={part.position}>
          <boxGeometry args={part.size.map((v) => Math.max(0.06, v + 0.04)) as Vec3} />
          <meshBasicMaterial
            color="#8fc4dc"
            wireframe
            transparent
            opacity={0.6}
            depthTest={false}
          />
        </mesh>
      )}
      {cables.map((c) => {
        const connected = assembly.connected.includes(c.id);
        const original = ['atx', 'eps', 'pcie', 'sata-data'].includes(c.id)
          ? groups[c.id as PcGroupId]
          : undefined;
        return (
          <group key={c.id}>
            {connected &&
              (original ? (
                <primitive object={original} />
              ) : (
                <ProceduralCable cable={c} powered={assembly.powered} />
              ))}
            {showPoints && !panelVisible && (
              <Html position={c.points.at(-1)} center>
                <button
                  className="power-hotspot"
                  disabled={!!busy || assembly.powered}
                  onClick={() => onToggleCable(c.id)}
                  aria-label={`${connected ? 'Desconectar' : 'Conectar'} ${c.name}`}
                >
                  {connected ? '✓' : '○'} {c.name}
                </button>
              </Html>
            )}
          </group>
        );
      })}
      {panelVisible && (
        <>
          <primitive object={cover} />
          <Suspense fallback={null}>
            <CaseClosureScrews
              positions={closurePositions}
              pending={closurePending}
              onComplete={onClosureComplete}
              onCancel={onClosureCancel}
              onActivity={onManualActivity}
            />
          </Suspense>
        </>
      )}
    </group>
  );
}
