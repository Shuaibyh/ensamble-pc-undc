import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';
import { emptyScrews, screwTransition } from '../domain/screwPlacement';
import { allFastenersPlaced } from '../domain/manualPlacement';
import './manualPlacement.css';

export interface ScrewPlacementProps {
  fasteners: Group[];
  axis: 'y' | 'z';
  name: string;
  blocked?: string;
  onComplete: () => void;
  onCancel?: () => void;
  onActivity?: (active: boolean) => void;
}

export function ScrewPlacement({
  fasteners,
  axis,
  name,
  blocked = '',
  onComplete,
  onCancel,
  onActivity,
}: ScrewPlacementProps) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControls | null;
  const normal = useMemo(() => new Vector3(0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), [axis]);
  const centers = useMemo(
    () => fasteners.map((s) => new Box3().setFromObject(s).getCenter(new Vector3())),
    [fasteners],
  );
  const [state, dispatch] = useReducer(
    (current: ReturnType<typeof emptyScrews>, action: Parameters<typeof screwTransition>[1]) =>
      screwTransition(current, action, fasteners.length, !blocked),
    undefined,
    emptyScrews,
  );
  const moving = useRef<Group>(null);
  const progress = useRef(0);
  const finished = useRef(false);
  const completed = useRef(false);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const callbacks = useRef({ onComplete, onActivity });
  callbacks.current = { onComplete, onActivity };
  const active = state.selected !== null || state.installed.length > 0 || state.inserting !== null;

  useEffect(() => {
    callbacks.current.onActivity?.(active);
    return () => callbacks.current.onActivity?.(false);
  }, [active]);
  useEffect(() => {
    if (!allFastenersPlaced(fasteners.length, state.installed) || completed.current) return;
    completed.current = true;
    callbacks.current.onComplete();
  }, [fasteners.length, state.installed]);
  useEffect(() => {
    progress.current = 0;
    finished.current = false;
  }, [state.inserting]);
  useEffect(() => {
    if (!controls || blocked || centers.length === 0) return;
    const stop = () => {
      goal.current = null;
    };
    controls.addEventListener('start', stop);
    // Stop any previous guided movement before focusing the actual screw anchor.
    controls.dispatchEvent({ type: 'start', target: controls });
    const bounds = new Box3().setFromPoints(centers);
    const target =
      state.selected === null ? bounds.getCenter(new Vector3()) : centers[state.selected].clone();
    const distance =
      state.selected === null ? Math.max(6, bounds.getSize(new Vector3()).length() * 1.5) : 5;
    const position = target.clone().addScaledVector(normal, distance);
    if (axis === 'y') position.z += 1.5;
    else position.y += 0.25;
    goal.current = { target, position };
    return () => {
      controls.removeEventListener('start', stop);
      goal.current = null;
    };
  }, [axis, blocked, centers, controls, normal, state.selected]);
  useFrame((_, delta) => {
    if (goal.current && controls) {
      const t = 1 - Math.exp(-Math.min(delta, 0.05) * 10);
      camera.position.lerp(goal.current.position, t);
      controls.target.lerp(goal.current.target, t);
      controls.update();
      if (camera.position.distanceTo(goal.current.position) < 0.005) goal.current = null;
    }
    const index = state.inserting;
    if (index === null || !moving.current || finished.current || blocked) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, 0.05) / 0.55);
    const t = progress.current;
    const eased = t * t * (3 - 2 * t);
    moving.current.position.copy(centers[index]).addScaledVector(normal, 0.35 * (1 - eased));
    moving.current.quaternion.setFromAxisAngle(normal, Math.PI * 6 * eased);
    if (t === 1) {
      finished.current = true;
      dispatch({ type: 'finish', index });
    }
  });
  const busy = state.inserting !== null;
  return (
    <group dispose={null}>
      {fasteners.map((screw, index) => (
        <group key={index}>
          {state.installed.includes(index) ? (
            <primitive object={screw} />
          ) : (
            <Html
              position={centers[index].clone().addScaledVector(normal, 0.12)}
              center
              zIndexRange={[25, 15]}
            >
              <button
                type="button"
                className={
                  'manual-target screw-target ' + (state.selected === index ? 'selected' : '')
                }
                aria-label={`Seleccionar ubicación del tornillo ${index + 1}`}
                aria-pressed={state.selected === index}
                disabled={!!blocked || busy}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: 'select', index });
                }}
              >
                {index + 1}
              </button>
            </Html>
          )}
        </group>
      ))}
      {state.inserting !== null && (
        <group
          ref={moving}
          position={centers[state.inserting].clone().addScaledVector(normal, 0.35)}
        >
          <group position={centers[state.inserting].clone().negate()}>
            <primitive object={fasteners[state.inserting]} />
          </group>
        </group>
      )}
      <Html
        fullscreen
        calculatePosition={(_, __, viewport) => [viewport.width / 2, viewport.height / 2]}
        zIndexRange={[40, 30]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="manual-toolbar screw-toolbar"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <strong>{name}</strong>
          <p role="status">
            Tornillos instalados: {state.installed.length}/{fasteners.length}
          </p>
          <p>
            {blocked ||
              (busy
                ? 'Insertando tornillo…'
                : state.selected === null
                  ? 'Haz clic en un punto numerado y pulsa Insertar.'
                  : `Ubicación ${state.selected + 1} seleccionada. Pulsa Insertar.`)}
          </p>
          <div className="manual-buttons">
            <button
              type="button"
              disabled={!!blocked || state.selected === null || busy}
              onClick={() => dispatch({ type: 'insert' })}
            >
              Insertar
            </button>
            <button
              type="button"
              disabled={busy || !active}
              onClick={() => {
                completed.current = false;
                dispatch({ type: 'reset' });
              }}
            >
              Restablecer tornillos
            </button>
            {onCancel && (
              <button type="button" disabled={busy} onClick={onCancel}>
                Cancelar fijación
              </button>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
