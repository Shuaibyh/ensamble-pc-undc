import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { Group, Plane, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { alignment, rotationStep } from '../domain/manualPlacement';
import { ghostOf } from './manualGeometry';
import { ScrewPlacement } from './ScrewPlacement';
import { createPlacementFrame, placementDragPlane, placementRayHit } from './placementFrame';
import './manualPlacement.css';

interface Props {
  object: Group;
  token: string;
  name: string;
  axis: 'y' | 'z';
  rotationAxis?: Vector3;
  blocked: string;
  fasteners?: Group[];
  fastenersOnly?: boolean;
  onComplete: () => void;
  onActivity: (active: boolean) => void;
}
type Phase = 'idle' | 'loose' | 'inserting' | 'screws';
export function ManualPlacement({
  object,
  token,
  name,
  axis,
  rotationAxis,
  blocked,
  fasteners = [],
  fastenersOnly = false,
  onComplete,
  onActivity,
}: Props) {
  const { camera, gl, events } = useThree();
  const controls = useThree((state) => state.controls) as OrbitControls | null;
  const frame = useMemo(() => createPlacementFrame(object, rotationAxis), [object, rotationAxis]);
  const { target, size, tolerance, rotationAxis: normal } = frame;
  const ghost = useMemo(() => ghostOf(frame.centered), [frame]);
  const root = useRef<Group>(null);
  const [phase, setPhase] = useState<Phase>(fastenersOnly ? 'screws' : 'idle');
  const [angle, setAngle] = useState(Math.PI / 4);
  const [position, setPosition] = useState(() => target.position.clone());
  const orientation = useMemo(
    () => new Quaternion().setFromAxisAngle(normal, angle).multiply(target.quaternion),
    [normal, angle, target],
  );
  const [message, setMessage] = useState('Arrastra la tarjeta del inventario al visor.');
  const moving = useRef<Group>(null);
  const motion = useRef({
    progress: 0,
    start: new Vector3(),
    rotation: new Quaternion(),
    done: false,
  });
  const drag = useRef<{ point: Vector3; start: Vector3; plane: Plane } | null>(null);
  const activity = useRef(onActivity);
  activity.current = onActivity;
  const result = alignment(position, target.position, orientation, target.quaternion, tolerance);
  useEffect(() => () => ghost.material.dispose(), [ghost]);
  useEffect(() => {
    activity.current(!blocked && !fastenersOnly && phase !== 'idle');
    return () => activity.current(false);
  }, [phase, blocked, fastenersOnly]);
  useEffect(
    () => () => {
      if (controls) controls.enabled = true;
    },
    [controls],
  );

  function pointAt(clientX: number, clientY: number) {
    if (!root.current) return null;
    const rect = gl.domElement.getBoundingClientRect();
    if (
      rect.width === 0 ||
      rect.height === 0 ||
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    )
      return null;
    const pointer = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      (-(clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new Raycaster();
    camera.updateMatrixWorld(true);
    root.current.updateWorldMatrix(true, false);
    ray.setFromCamera(pointer, camera);
    const plane = placementDragPlane(
      target.position,
      root.current.matrixWorld,
      camera.getWorldDirection(new Vector3()),
    );
    return placementRayHit(ray.ray, plane, root.current.matrixWorld);
  }
  useEffect(() => {
    if (fastenersOnly || phase === 'screws') return;
    const element = (events.connected ?? gl.domElement.parentElement!) as HTMLElement;
    function over(event: DragEvent) {
      event.preventDefault();
      if (event.dataTransfer)
        event.dataTransfer.dropEffect = blocked || phase === 'inserting' ? 'none' : 'move';
    }
    function drop(event: DragEvent) {
      event.preventDefault();
      const value = event.dataTransfer?.getData('text/plain');
      if (blocked) {
        setMessage(blocked);
        return;
      }
      if (phase === 'inserting') return;
      if (value === token) {
        const point = pointAt(event.clientX, event.clientY);
        if (!point) return;
        if (controls) controls.dispatchEvent({ type: 'start', target: controls });
        setPosition(point);
        setAngle(Math.PI / 4);
        setPhase('loose');
        setMessage('Mueve la pieza hacia la silueta y gira hasta alinear. Soltar no instala.');
      }
    }
    element.addEventListener('dragover', over);
    element.addEventListener('drop', drop);
    return () => {
      element.removeEventListener('dragover', over);
      element.removeEventListener('drop', drop);
    };
    // Keep the current camera and drop state; pointAt uses no external mutable data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, events.connected, camera, controls, token, blocked, phase, target, fastenersOnly]);

  function down(event: ThreeEvent<PointerEvent>) {
    if (blocked || phase !== 'loose' || !root.current) return;
    event.stopPropagation();
    root.current.updateWorldMatrix(true, false);
    const plane = placementDragPlane(
      target.position,
      root.current.matrixWorld,
      camera.getWorldDirection(new Vector3()),
    );
    const point = placementRayHit(event.ray, plane, root.current.matrixWorld);
    if (!point) return;
    // Preserve where the user grabbed the mesh. A center ray reprojects depth
    // after a camera change without snapping the part's center to the cursor.
    const projected = position.clone().applyMatrix4(root.current.matrixWorld).project(camera);
    const centerRay = new Raycaster();
    centerRay.setFromCamera(new Vector2(projected.x, projected.y), camera);
    const start = placementRayHit(centerRay.ray, plane, root.current.matrixWorld);
    if (!start) return;
    setPosition(start);
    drag.current = { point, start: start.clone(), plane };
    if (controls) {
      controls.dispatchEvent({ type: 'start', target: controls });
      controls.enabled = false;
    }
    (event.target as Element).setPointerCapture(event.pointerId);
  }
  function move(event: ThreeEvent<PointerEvent>) {
    if (!drag.current || !root.current) return;
    event.stopPropagation();
    root.current.updateWorldMatrix(true, false);
    const point = placementRayHit(event.ray, drag.current.plane, root.current.matrixWorld);
    if (!point) return;
    const next = point.sub(drag.current.point).add(drag.current.start);
    setPosition(next);
  }
  function up(event: ThreeEvent<PointerEvent>) {
    if (!drag.current) return;
    event.stopPropagation();
    drag.current = null;
    if (controls) controls.enabled = true;
    (event.target as Element).releasePointerCapture(event.pointerId);
  }
  function insert() {
    if (phase !== 'loose' || blocked || !moving.current) return;
    const actual = alignment(
      moving.current.position,
      target.position,
      moving.current.quaternion,
      target.quaternion,
      tolerance,
    );
    if (!actual.positionOk || !actual.orientationOk) {
      setMessage('✕ No encaja: mueve el centro hacia el aro y corrige el giro.');
      return;
    }
    motion.current = {
      progress: 0,
      start: moving.current.position.clone(),
      rotation: moving.current.quaternion.clone(),
      done: false,
    };
    setPhase('inserting');
    setMessage('Insertando…');
  }
  function reset() {
    if (controls) controls.enabled = true;
    drag.current = null;
    setAngle(Math.PI / 4);
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    if (root.current) right.transformDirection(root.current.matrixWorld.clone().invert());
    setPosition(target.position.clone().addScaledVector(right, 0.8));
    setPhase('loose');
    if (fastenersOnly) setPhase('screws');
    setMessage('Pieza restablecida. Mueve y gira antes de insertar.');
  }
  useFrame((_, delta) => {
    if (phase !== 'inserting' || motion.current.done) return;
    const animation = motion.current;
    animation.progress = Math.min(1, animation.progress + Math.min(delta, 0.05) / 0.7);
    const t = animation.progress;
    const eased = t * t * (3 - 2 * t);
    if (moving.current) {
      moving.current.position.lerpVectors(animation.start, target.position, eased);
      moving.current.quaternion.copy(animation.rotation).slerp(target.quaternion, eased);
    }
    if (t < 1) return;
    animation.done = true;
    if (fasteners.length) {
      setPhase('screws');
    } else onComplete();
  });
  const busy = phase === 'inserting';
  return (
    <group ref={root} dispose={null}>
      {!blocked && phase !== 'screws' && (
        <group position={target.position} quaternion={target.quaternion}>
          <primitive object={ghost.object} />
          <Html center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <span
              className={
                'manual-target ' +
                (result.positionOk && result.orientationOk && phase === 'loose' ? 'valid' : '')
              }
            >
              ＋
            </span>
          </Html>
        </group>
      )}
      {phase !== 'idle' && !fastenersOnly && (
        <group
          ref={moving}
          position={phase === 'screws' ? target.position : position}
          quaternion={phase === 'screws' ? target.quaternion : orientation}
          onPointerDown={(e) => down(e)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <primitive object={frame.centered} />
          {phase === 'loose' && (
            <mesh>
              <boxGeometry
                args={size.toArray().map((v) => Math.max(v, 0.24)) as [number, number, number]}
              />
              <meshBasicMaterial transparent opacity={0.06} color="#73e4ff" depthWrite={false} />
            </mesh>
          )}
        </group>
      )}
      {phase === 'screws' && (
        <ScrewPlacement
          fasteners={fasteners}
          axis={axis}
          name={name}
          blocked={blocked}
          onComplete={onComplete}
          onActivity={fastenersOnly ? onActivity : undefined}
          onCancel={
            fastenersOnly
              ? undefined
              : () => {
                  setPhase('idle');
                  setMessage('Fijación cancelada. Arrastra la pieza para volver a colocarla.');
                }
          }
        />
      )}
      {phase !== 'screws' && (
        <Html
          fullscreen
          calculatePosition={(_, __, viewport) => [viewport.width / 2, viewport.height / 2]}
          zIndexRange={[40, 30]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="manual-toolbar" onPointerDown={(e) => e.stopPropagation()}>
            <strong>
              {name} · {phase === 'idle' ? 'Pendiente' : 'En manipulación'}
            </strong>
            <div className="manual-buttons">
              <button
                disabled={phase !== 'loose'}
                onClick={() => setAngle((a) => a - rotationStep)}
              >
                ↶ Girar izquierda
              </button>
              <button
                disabled={phase !== 'loose'}
                onClick={() => setAngle((a) => a + rotationStep)}
              >
                ↷ Girar derecha
              </button>
              <button disabled={phase !== 'loose' || !!blocked} onClick={insert}>
                ↓ Insertar
              </button>
              <button disabled={phase === 'idle' || busy} onClick={reset}>
                ↺ Restablecer pieza
              </button>
              <button
                disabled={phase === 'idle' || busy}
                onClick={() => {
                  setPhase('idle');
                  setMessage('Cancelado. Arrastra la tarjeta para volver a intentarlo.');
                }}
              >
                ✕ Cancelar
              </button>
            </div>
            <p role="status">
              {blocked ||
                (phase === 'loose'
                  ? `${result.positionOk && result.orientationOk ? '✓ Alineada: pulsa Insertar.' : '✕ Falta ' + (!result.positionOk ? 'acercar al aro. ' : '') + (!result.orientationOk ? 'corregir giro. ' : '')} Giro: ${Math.round((angle * 180) / Math.PI)}°. `
                  : '') + message}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
