import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BoxGeometry,
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
} from 'three';
import type { SetupCableId } from '../domain/setup';
import { setupRoutes, setupPortNames } from '../data/setupLayout';
import { plugMatrix, resolveSocketFrame, type SocketFrame, type SocketId } from './setupSockets';

// Preserve the accepted cable volume exactly.
const cableAppearance: Record<SetupCableId, { radius: number; color: string }> = {
  'pc-power': { radius: 0.034, color: '#171d25' },
  'monitor-power': { radius: 0.03, color: '#1b222b' },
  video: { radius: 0.026, color: '#202936' },
  'keyboard-usb': { radius: 0.02, color: '#252e39' },
  'mouse-usb': { radius: 0.02, color: '#252e39' },
};

function createPlug() {
  const group = new Group();
  group.matrixAutoUpdate = false;
  const tip = new Object3D();
  tip.name = 'plugTipAnchor';
  const exit = new Object3D();
  exit.name = 'cableExitAnchor';
  const sleeve = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: '#a9b4c0', metalness: 0.7, roughness: 0.35 }),
  );
  const body = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: '#252b35', roughness: 0.72 }),
  );
  group.add(tip, exit, sleeve, body);
  return { group, tip, exit, sleeve, body };
}

function fitPlug(
  plug: ReturnType<typeof createPlug>,
  frame: SocketFrame,
  radius: number,
  travel: number,
) {
  const length = Math.max(frame.height, frame.width) * 1.65;
  plug.sleeve.scale.set(frame.depth, frame.height * 0.86, frame.width * 0.86);
  plug.sleeve.position.set(-frame.depth / 2, 0, 0);
  plug.body.scale.set(
    length,
    Math.max(frame.height * 1.06, radius * 2.3),
    Math.max(frame.width * 1.06, radius * 2.3),
  );
  plug.body.position.set(-frame.depth - length / 2, 0, 0);
  plug.exit.position.set(-frame.depth - length, 0, 0);
  plug.tip.updateMatrix();
  plug.group.matrix.copy(plugMatrix(frame, plug.tip.matrix, travel));
  plug.group.updateWorldMatrix(false, true);
}

export function AnimatedSetupCable({
  id,
  animate,
  attached,
  selected,
  onConnect,
  onFinish,
  pcRoot,
  monitorRoot,
}: {
  id: SetupCableId;
  animate: boolean;
  attached: boolean;
  selected: boolean;
  onConnect: () => void;
  onFinish: () => void;
  pcRoot: RefObject<Group | null>;
  monitorRoot: RefObject<Group | null>;
}) {
  const parent = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const progress = useRef(0);
  const finished = useRef(false);
  const previous = useRef('');
  const plugs = useMemo(() => [createPlug(), createPlug()], []);
  const outlet = id === 'pc-power' || id === 'monitor-power';
  const appearance = cableAppearance[id];
  useEffect(() => {
    progress.current = animate ? 0 : 1;
    finished.current = false;
    previous.current = '';
  }, [animate, attached]);
  useEffect(
    () => () => {
      for (const plug of plugs) {
        plug.sleeve.geometry.dispose();
        plug.sleeve.material.dispose();
        plug.body.geometry.dispose();
        plug.body.material.dispose();
      }
    },
    [plugs],
  );
  useFrame((_, delta) => {
    const space = parent.current;
    if (!space || !pcRoot.current || !monitorRoot.current) return;
    const frame = (socket: SocketId) =>
      resolveSocketFrame(
        socket.startsWith('monitor-') ? monitorRoot.current! : pcRoot.current!,
        socket,
        space,
      );
    const destination = frame(id);
    const monitorVideo = id === 'video' ? frame('monitor-video') : null;
    if (!destination || (id === 'video' && !monitorVideo)) return;
    if (marker.current) marker.current.position.copy(destination.surface);
    if (!attached || !cable.current) return;
    progress.current =
      animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? Math.min(1, progress.current + delta / 1.2)
        : 1;
    const travel = 0.38 * (1 - progress.current) ** 3;
    fitPlug(plugs[0], destination, appearance.radius, travel);
    plugs[0].group.visible = true;
    const exit = space.worldToLocal(plugs[0].exit.getWorldPosition(new Vector3()));
    const lead = exit.clone().addScaledVector(destination.inward, -0.16);
    const points = setupRoutes[id].map((p) => new Vector3(...p));
    if (outlet) points.unshift(exit, lead);
    else points.push(lead, exit);
    if (monitorVideo) {
      fitPlug(plugs[1], monitorVideo, appearance.radius, 0);
      plugs[1].group.visible = true;
      const monitorExit = space.worldToLocal(plugs[1].exit.getWorldPosition(new Vector3()));
      points.unshift(monitorExit, monitorExit.clone().addScaledVector(monitorVideo.inward, -0.16));
    }
    if (outlet) points[points.length - 1].y += 0.14;
    const key = points.map((p) => p.toArray().join(',')).join(';');
    if (key !== previous.current) {
      cable.current.geometry.dispose();
      cable.current.geometry = new TubeGeometry(
        new CatmullRomCurve3(points, false, 'centripetal', 0.45),
        112,
        appearance.radius,
        10,
        false,
      );
      previous.current = key;
    }
    cable.current.visible = true;
    if (progress.current === 1 && animate && !finished.current) {
      finished.current = true;
      onFinish();
    }
  });
  return (
    <group ref={parent}>
      {selected && !attached && (
        <group ref={marker}>
          <Html center>
            <button className="button primary" onClick={onConnect}>
              Conectar a {setupPortNames[id]}
            </button>
          </Html>
        </group>
      )}
      {attached && (
        <>
          <mesh ref={cable} visible={false}>
            <bufferGeometry />
            <meshStandardMaterial color={appearance.color} roughness={0.72} />
          </mesh>
          {plugs.map((plug, index) => (
            <primitive key={index} object={plug.group} visible={false} />
          ))}
          {outlet && (
            <mesh
              position={[
                setupRoutes[id].at(-1)![0],
                setupRoutes[id].at(-1)![1] + 0.07,
                setupRoutes[id].at(-1)![2],
              ]}
            >
              <boxGeometry args={[0.1, 0.14, 0.1]} />
              <meshStandardMaterial color="#222831" />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}
