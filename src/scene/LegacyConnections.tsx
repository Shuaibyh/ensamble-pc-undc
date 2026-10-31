import { Html } from '@react-three/drei';
import { CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3 } from 'three';
import { cables } from '../data/legacyCatalog';
import type { Assembly } from '../domain/assembly';
import type { CableId } from '../domain/types';
import { Box } from './primitives';
import { FanHeaderConnector } from './FanHeaderConnector';

const cableColors: Record<CableId, string> = {
  'sata-data': '#b45248',
  'sata-power': '#57525b',
  atx: '#8b73ff',
  eps: '#45b9ff',
  pcie: '#ffc35c',
  'fan-top': '#55e6bd',
  'fan-middle': '#55e6bd',
  'fan-bottom': '#55e6bd',
  'fan-rear': '#55e6bd',
  'cpu-fan': '#ff75bd',
};

function PowerConnector({
  pins,
  connected,
  source = false,
}: {
  pins: number;
  connected: boolean;
  source?: boolean;
}) {
  const columns = pins / 2;
  const width = columns * 0.044 + 0.07;
  return (
    <group rotation={source ? [0, Math.PI, 0] : undefined}>
      <Box size={[width, 0.16, 0.14]} color={connected ? '#18253a' : '#30445d'} />
      <Box position={[0, 0.105, 0]} size={[width * 0.45, 0.05, 0.12]} color="#60758e" />
      {Array.from({ length: pins }, (_, pin) => (
        <Box
          key={pin}
          position={[
            ((pin % columns) - (columns - 1) / 2) * 0.044,
            Math.floor(pin / columns) * 0.048 - 0.024,
            0.078,
          ]}
          size={[0.026, 0.027, 0.018]}
          color={connected ? '#d9b96f' : '#172335'}
        />
      ))}
    </group>
  );
}

// Redondea esquinas sin salir del recorrido definido por los puntos del cable.
const routes = Object.fromEntries(
  cables.map((cable) => {
    const points = cable.points.map((point) => new Vector3(...point));
    const route = new CurvePath<Vector3>();
    let start = points[0];
    for (let i = 1; i < points.length - 1; i++) {
      const incoming = points[i - 1].clone().lerp(points[i], 0.9);
      const outgoing = points[i].clone().lerp(points[i + 1], 0.1);
      route.add(new LineCurve3(start, incoming));
      route.add(new QuadraticBezierCurve3(incoming, points[i], outgoing));
      start = outgoing;
    }
    route.add(new LineCurve3(start, points[points.length - 1]));
    return [cable.id, route];
  }),
);

export function Connections({
  assembly,
  disabled,
  showPoints,
  onToggle,
}: {
  assembly: Assembly;
  disabled: boolean;
  showPoints: boolean;
  onToggle: (id: CableId) => void;
}) {
  return (
    <>
      {cables.map((cable) => {
        const connected = assembly.connected.includes(cable.id);
        const ready = cable.depends.every((id) => assembly.installed.includes(id));
        const fanCable = cable.id.startsWith('fan-') || cable.id === 'cpu-fan';
        const start = cable.points[0];
        const end = cable.points[cable.points.length - 1];
        return (
          <group key={cable.id}>
            {ready && connected && (
              <>
                <group position={start}>
                  {fanCable ? (
                    <Box
                      size={[0.12, 0.08, 0.1]}
                      color={connected ? cableColors[cable.id] : '#30445d'}
                    />
                  ) : (
                    <group rotation={[0, Math.PI / 2, 0]}>
                      <PowerConnector pins={cable.pins} connected={connected} />
                    </group>
                  )}
                </group>
                <group position={end}>
                  {fanCable ? (
                    <FanHeaderConnector />
                  ) : (
                    <PowerConnector pins={cable.pins} connected={connected} />
                  )}
                </group>
              </>
            )}
            {connected && (
              <group>
                {[-0.025, 0, 0.025].map((offset) => (
                  <mesh key={offset} position={[offset, 0, 0]}>
                    <tubeGeometry args={[routes[cable.id], 64, 0.013, 6, false]} />
                    <meshStandardMaterial
                      color={cableColors[cable.id]}
                      emissive={assembly.powered ? cableColors[cable.id] : '#000000'}
                      emissiveIntensity={assembly.powered ? 0.18 : 0}
                      roughness={0.68}
                    />
                  </mesh>
                ))}
              </group>
            )}
            {ready && showPoints && (
              <Html position={cable.points[cable.points.length - 1]} center>
                <button
                  className={`connector-point ${connected ? 'connected' : ''}`}
                  disabled={disabled}
                  aria-label={`${connected ? 'Desconectar' : 'Conectar'} ${cable.name}`}
                  onClick={() => onToggle(cable.id)}
                  title={cable.name}
                >
                  {connected ? '✓' : '+'} {cable.id.toUpperCase()}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}
