import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import {
  fanCasePath,
  fanDefinitions,
  fanScale,
  fanScrewPath,
  screwOffsets,
  type FanDefinition,
  type FanId,
} from '../data/fansArgb';
import { Global3DLoader } from '../components/ui/Global3DLoader';

export type FanPreviewMode = 'off' | 'fixed' | 'rainbow';
export type FanCameraMode = 'guided' | 'free';
export type FanCameraAction =
  'left' | 'right' | 'in' | 'out' | 'reset' | 'focus' | 'front' | 'lateral' | 'top' | 'screw';
export interface FanCameraCommand {
  action: FanCameraAction;
  sequence: number;
  target?: readonly [number, number, number];
}
export interface ScrewSelection {
  fan: FanId;
  index: number;
}
export interface InventoryPointer {
  id: FanId;
  clientX: number;
  clientY: number;
  inside: boolean;
}

interface Props {
  selected: FanId;
  loose: readonly FanId[];
  installed: readonly FanId[];
  screws: Record<FanId, readonly boolean[]>;
  rotations: Record<FanId, number>;
  positionReset: Record<FanId, number>;
  inserting: FanId | null;
  screwBusy: ScrewSelection | null;
  previewMode: FanPreviewMode;
  fixedColor: string;
  spinPreview: boolean;
  resetToken: number;
  cameraMode: FanCameraMode;
  cameraCommand: FanCameraCommand;
  inventoryPointer: InventoryPointer | null;
  onSelect: (id: FanId) => void;
  onPlacement: (id: FanId, aligned: boolean, correction: string) => void;
  onInsertionComplete: (id: FanId) => void;
  onScrew: (fan: FanId, index: number) => void;
  onScrewRejected: (fan: FanId, index: number) => void;
  onScrewComplete: (fan: FanId, index: number) => void;
}

function cloneFan(source: Object3D, definition: FanDefinition) {
  const object = source.clone(true);
  const leds: MeshStandardMaterial[] = [];
  object.traverse((node) => {
    if (!(node instanceof Mesh) || !node.name.includes('ARGB_LED')) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const cloned = materials.map((material) => material.clone());
    node.material = Array.isArray(node.material) ? cloned : cloned[0];
    cloned.forEach((material) => {
      if (material instanceof MeshStandardMaterial) {
        material.toneMapped = false;
        leds.push(material);
      }
    });
  });
  return { object, leds, rotor: object.getObjectByName(definition.rotorName) };
}

function FanModel({ definition, props }: { definition: FanDefinition; props: Props }) {
  const { scene } = useGLTF(definition.modelPath);
  const prepared = useMemo(() => cloneFan(scene, definition), [scene, definition]);
  const group = useRef<Group>(null);
  const controls = useThree((state) => state.controls as Controls | undefined);
  const { camera, gl } = useThree();
  const drag = useRef<{ point: Vector3; offset: Vector3; plane: Plane } | null>(null);
  const insertionStart = useRef(new Vector3());
  const insertionProgress = useRef(0);
  const insertionFinished = useRef(false);
  const resetValue = props.positionReset[definition.id];
  const previousResetValue = useRef(resetValue);
  const [dragging, setDragging] = useState(false);
  const target = useMemo(() => new Vector3(...definition.target), [definition.target]);
  const tray = useMemo(() => new Vector3(...definition.tray), [definition.tray]);
  const isLoose = props.loose.includes(definition.id);
  const isInstalled = props.installed.includes(definition.id);
  const isInserting = props.inserting === definition.id;
  const fromInventory =
    props.inventoryPointer?.id === definition.id && props.inventoryPointer.inside;
  const visible = isLoose || isInstalled || isInserting || fromInventory;

  useEffect(() => {
    if (!group.current || isInserting) return;
    if (isInstalled) group.current.position.copy(target);
    else if (!isLoose) group.current.position.copy(tray);
  }, [isInstalled, isInserting, isLoose, props.resetToken, target, tray]);
  useEffect(() => {
    if (previousResetValue.current === resetValue) return;
    previousResetValue.current = resetValue;
    if (!group.current || !isLoose || isInstalled) return;
    group.current.position.copy(tray);
  }, [isInstalled, isLoose, resetValue, tray]);
  useEffect(() => {
    if (group.current)
      group.current.rotation.set(0, 0, props.rotations[definition.id] * (Math.PI / 2));
  }, [definition.id, props.rotations]);
  useEffect(() => {
    const pointer = props.inventoryPointer;
    if (!group.current || !pointer || pointer.id !== definition.id || !pointer.inside) return;
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new Vector2(
      ((pointer.clientX - rect.left) / rect.width) * 2 - 1,
      -((pointer.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const point = raycaster.ray.intersectPlane(
      new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), tray),
      new Vector3(),
    );
    if (point) group.current.position.copy(point);
  }, [camera, definition.id, gl, props.inventoryPointer, tray]);
  useEffect(() => {
    if (!isInserting || !group.current) return;
    insertionStart.current.copy(group.current.position);
    insertionProgress.current = 0;
    insertionFinished.current = false;
  }, [isInserting]);

  useFrame(({ clock }, delta) => {
    if (props.spinPreview && prepared.rotor) prepared.rotor.rotation.z += delta * 7;
    prepared.leds.forEach((material, index) => {
      if (props.previewMode === 'off') {
        material.color.set('#1a2028');
        material.emissive.set('#000000');
        material.emissiveIntensity = 0;
      } else {
        const color =
          props.previewMode === 'rainbow'
            ? new Color().setHSL((clock.elapsedTime * 0.12 + index / 8) % 1, 0.95, 0.58)
            : new Color(props.fixedColor);
        material.color.copy(color);
        material.emissive.copy(color);
        material.emissiveIntensity = 2.2;
      }
    });
    if (!isInserting || !group.current || insertionFinished.current) return;
    insertionProgress.current = Math.min(1, insertionProgress.current + delta / 0.65);
    const t = insertionProgress.current;
    group.current.position.lerpVectors(insertionStart.current, target, t * t * (3 - 2 * t));
    if (t === 1) {
      insertionFinished.current = true;
      props.onInsertionComplete(definition.id);
    }
  });

  function pointerDown(event: ThreeEvent<PointerEvent>) {
    if (!isLoose || isInstalled || isInserting || !group.current) return;
    event.stopPropagation();
    drag.current = {
      point: event.point.clone(),
      offset: group.current.position.clone(),
      plane: new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(0, 0, 1),
        group.current.position,
      ),
    };
    (event.target as Element).setPointerCapture(event.pointerId);
    if (controls) controls.enabled = false;
    setDragging(true);
    props.onSelect(definition.id);
  }
  function pointerMove(event: ThreeEvent<PointerEvent>) {
    if (!drag.current || !group.current) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(drag.current.plane, new Vector3());
    if (point) group.current.position.copy(point.sub(drag.current.point).add(drag.current.offset));
  }
  function pointerUp(event: ThreeEvent<PointerEvent>) {
    if (!drag.current || !group.current) return;
    event.stopPropagation();
    drag.current = null;
    if (controls) controls.enabled = props.cameraMode === 'free';
    setDragging(false);
    (event.target as Element).releasePointerCapture(event.pointerId);
    const positionOk = group.current.position.distanceTo(target) <= 0.25;
    const angle = Math.abs(((group.current.rotation.z + Math.PI) % (Math.PI * 2)) - Math.PI);
    const orientationOk = angle <= 0.12;
    props.onPlacement(
      definition.id,
      positionOk && orientationOk,
      !positionOk
        ? 'Acerca el centro del ventilador al soporte iluminado.'
        : !orientationOk
          ? 'Corrige la orientación con los controles de giro del visor.'
          : 'Alineación correcta. Ya puedes insertar el ventilador.',
    );
  }
  return (
    <group
      ref={group}
      visible={visible}
      scale={fanScale}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => {
        drag.current = null;
        if (controls) controls.enabled = props.cameraMode === 'free';
        setDragging(false);
      }}
    >
      <primitive object={prepared.object} />
      {(dragging || fromInventory) && (
        <Html position={[0, 0.085, 0]} center>
          <span className="fan-drag-label">Suelta dentro del área 3D</span>
        </Html>
      )}
    </group>
  );
}

function AnimatedScrew({
  position,
  installed,
  active,
  onComplete,
}: {
  position: Vector3;
  installed: boolean;
  active: boolean;
  onComplete: () => void;
}) {
  const { scene } = useGLTF(fanScrewPath);
  const object = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<Group>(null);
  const progress = useRef(0);
  const completed = useRef(false);
  useEffect(() => {
    if (!group.current) return;
    progress.current = 0;
    completed.current = false;
    group.current.position.copy(position).add(new Vector3(0, 0, active ? 0.32 : 0));
  }, [active, position]);
  useFrame((_, delta) => {
    if (!active || !group.current || completed.current) return;
    progress.current = Math.min(1, progress.current + delta / 0.55);
    const t = progress.current;
    group.current.position.z = position.z + (1 - t) * 0.32;
    group.current.rotation.z += delta * 24;
    if (t === 1) {
      completed.current = true;
      onComplete();
    }
  });
  if (!installed && !active) return null;
  return (
    <group ref={group} position={position} scale={fanScale}>
      <primitive object={object} />
    </group>
  );
}

function DraggableScrew({
  definition,
  index,
  target,
  props,
}: {
  definition: FanDefinition;
  index: number;
  target: Vector3;
  props: Props;
}) {
  const { scene } = useGLTF(fanScrewPath);
  const object = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<Group>(null);
  const controls = useThree((state) => state.controls as Controls | undefined);
  const drag = useRef<{ point: Vector3; offset: Vector3; plane: Plane } | null>(null);
  const tray = useMemo(
    () =>
      new Vector3(
        1.55 + (index % 2) * 0.24,
        definition.target[1] + (Math.floor(index / 2) - 0.5) * 0.22,
        1.5,
      ),
    [definition.target, index],
  );
  const placed = props.screws[definition.id][index];
  const active = props.screwBusy?.fan === definition.id && props.screwBusy.index === index;
  const available = props.installed.includes(definition.id) && !placed && !active;
  useEffect(() => {
    if (group.current && available) group.current.position.copy(tray);
  }, [available, tray]);
  function down(event: ThreeEvent<PointerEvent>) {
    if (!available || !group.current || props.screwBusy) return;
    event.stopPropagation();
    drag.current = {
      point: event.point.clone(),
      offset: group.current.position.clone(),
      plane: new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(0, 0, 1),
        group.current.position,
      ),
    };
    (event.target as Element).setPointerCapture(event.pointerId);
    if (controls) controls.enabled = false;
    props.onSelect(definition.id);
  }
  function move(event: ThreeEvent<PointerEvent>) {
    if (!drag.current || !group.current) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(drag.current.plane, new Vector3());
    if (point) group.current.position.copy(point.sub(drag.current.point).add(drag.current.offset));
  }
  function up(event: ThreeEvent<PointerEvent>) {
    if (!drag.current || !group.current) return;
    event.stopPropagation();
    drag.current = null;
    if (controls) controls.enabled = props.cameraMode === 'free';
    (event.target as Element).releasePointerCapture(event.pointerId);
    if (group.current.position.distanceTo(target) <= 0.34) props.onScrew(definition.id, index);
    else {
      group.current.position.copy(tray);
      props.onScrewRejected(definition.id, index);
    }
  }
  if (!available) return null;
  return (
    <group
      ref={group}
      position={tray}
      scale={fanScale}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <primitive object={object} />
      <Html position={[0, 0.015, 0]} center>
        <span className="fan-screw-label">{index + 1}</span>
      </Html>
    </group>
  );
}

function GuidedCamera({ command, mode }: { command: FanCameraCommand; mode: FanCameraMode }) {
  const controls = useRef<Controls>(null);
  const { camera } = useThree();
  const goalPosition = useRef(new Vector3(4.6, 3.2, 7.2));
  const goalTarget = useRef(new Vector3(0.65, 1.4, 0.55));
  useEffect(() => {
    if (mode === 'free') return;
    const target = new Vector3(...(command.target ?? [0, 1.35, 1.05]));
    if (command.action === 'front') {
      goalPosition.current.set(0.85, 1.75, 6.25);
      goalTarget.current.set(0, 1.35, 0.8);
    } else if (command.action === 'lateral') {
      goalPosition.current.set(6.2, 1.8, 1.8);
      goalTarget.current.set(0, 1.35, 0.55);
    } else if (command.action === 'top') {
      goalPosition.current.set(0.2, 7.2, 1.8);
      goalTarget.current.set(0, 1.3, 0.4);
    } else if (command.action === 'focus') {
      goalPosition.current.copy(target).add(new Vector3(1.35, 0.8, 3.45));
      goalTarget.current.copy(target);
    } else if (command.action === 'screw') {
      goalPosition.current.copy(target).add(new Vector3(0.8, 0.5, 2.15));
      goalTarget.current.copy(target);
    } else if (command.action === 'reset') {
      goalPosition.current.set(4.6, 3.2, 7.2);
      goalTarget.current.set(0.65, 1.4, 0.55);
    }
  }, [command, mode]);
  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || mode === 'free') return;
    const factor = 1 - Math.exp(-4.5 * delta);
    camera.position.lerp(goalPosition.current, factor);
    orbit.target.lerp(goalTarget.current, factor);
    orbit.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={mode === 'free'}
      target={[0.65, 1.4, 0.55]}
      minDistance={2.4}
      maxDistance={12}
      maxPolarAngle={Math.PI * 0.88}
      enableDamping
    />
  );
}

function Models(props: Props) {
  const { scene: caseScene } = useGLTF(fanCasePath);
  return (
    <>
      <primitive object={caseScene} scale={fanScale} />
      {fanDefinitions.map((definition) => (
        <FanModel key={definition.id} definition={definition} props={props} />
      ))}
      {fanDefinitions.flatMap((definition) =>
        screwOffsets.map((offset, index) => {
          const position = new Vector3(...definition.target).add(new Vector3(...offset));
          const installed = props.screws[definition.id][index];
          const active = props.screwBusy?.fan === definition.id && props.screwBusy.index === index;
          return (
            <group key={`${definition.id}-${index}`}>
              <AnimatedScrew
                position={position}
                installed={installed}
                active={active}
                onComplete={() => props.onScrewComplete(definition.id, index)}
              />
              <DraggableScrew
                definition={definition}
                index={index}
                target={position}
                props={props}
              />
              {props.installed.includes(definition.id) && !installed && !active && (
                <mesh position={position}>
                  <ringGeometry args={[0.07, 0.1, 28]} />
                  <meshBasicMaterial color="#67e2ff" transparent opacity={0.8} />
                </mesh>
              )}
            </group>
          );
        }),
      )}
      {fanDefinitions.map((definition) =>
        !props.installed.includes(definition.id) ? (
          <mesh key={`target-${definition.id}`} position={definition.target}>
            <ringGeometry args={[0.32, 0.36, 48]} />
            <meshBasicMaterial
              color={props.selected === definition.id ? '#67e2ff' : '#496b83'}
              transparent
              opacity={0.75}
            />
          </mesh>
        ) : null,
      )}
    </>
  );
}

export function FansArgbScene(props: Props) {
  return (
    <Canvas camera={{ position: [4.6, 3.2, 7.2], fov: 38, near: 0.02, far: 60 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#102238']} />
      <hemisphereLight args={['#dcecff', '#53667a', 1.25]} />
      <directionalLight position={[4, 7, 6]} intensity={1.5} />
      <directionalLight position={[-4, 3, 2]} intensity={0.7} color="#61cfff" />
      <GuidedCamera command={props.cameraCommand} mode={props.cameraMode} />
      <Suspense
        fallback={
          <Html center>
            <Global3DLoader
              variant="model"
              compact
              status="Cargando gabinete y ventiladores ARGB..."
            />
          </Html>
        }
      >
        <Models {...props} />
      </Suspense>
      <gridHelper args={[12, 24, '#2d668c', '#24445f']} position={[0, -0.02, 0]} />
    </Canvas>
  );
}

fanDefinitions.forEach((fan) => useGLTF.preload(fan.modelPath));
useGLTF.preload(fanCasePath);
useGLTF.preload(fanScrewPath);
