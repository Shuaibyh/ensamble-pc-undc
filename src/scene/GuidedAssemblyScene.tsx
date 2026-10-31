import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, Group, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import {
  guidedPieces,
  type GuidedKind,
  type GuidedPieceDefinition,
  type GuidedPieceId,
} from '../data/guidedAssembly';
import { pcModel, type PcGroupId } from '../data/pcModel';
import { laptopModelPath } from '../data/laptop';
import { preparePcModel } from './preparePcModel';
import { prepareAssemblyLaptop } from './prepareAssemblyLaptop';
import { Global3DLoader } from '../components/ui/Global3DLoader';

const fanScrewPath = '/models/cooling/UNDC_TORNILLO_FAN_TIPO_v08.glb';

export type GuidedCameraMode = 'guided' | 'free';
export type GuidedCameraAction = 'home' | 'front' | 'top' | 'focus' | 'screw';
export interface GuidedCameraCommand {
  action: GuidedCameraAction;
  sequence: number;
  target?: readonly [number, number, number];
}
export interface GuidedInventoryPointer {
  id: GuidedPieceId;
  clientX: number;
  clientY: number;
  inside: boolean;
}
export interface GuidedScrewSelection {
  piece: GuidedPieceId;
  index: number;
}

interface Props {
  kind: GuidedKind;
  selected: GuidedPieceId;
  loose: GuidedPieceId[];
  inserted: GuidedPieceId[];
  screws: Record<GuidedPieceId, boolean[]>;
  rotations: Record<GuidedPieceId, number>;
  positionReset: Record<GuidedPieceId, number>;
  inserting: GuidedPieceId | null;
  screwBusy: GuidedScrewSelection | null;
  inventoryPointer: GuidedInventoryPointer | null;
  cameraMode: GuidedCameraMode;
  cameraCommand: GuidedCameraCommand;
  onSelect: (id: GuidedPieceId) => void;
  onPlacement: (id: GuidedPieceId, aligned: boolean, message: string) => void;
  onInsertionComplete: (id: GuidedPieceId) => void;
  onScrew: (piece: GuidedPieceId, index: number) => void;
  onScrewRejected: (piece: GuidedPieceId, index: number) => void;
  onScrewComplete: (piece: GuidedPieceId, index: number) => void;
}

interface PreparedPiece {
  object: Group;
  target: Vector3;
  size: Vector3;
}

function centerPiece(source: Group): PreparedPiece {
  const clone = source.clone(true);
  clone.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(clone);
  const target = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const centered = new Group();
  clone.position.sub(target);
  centered.add(clone);
  return { object: centered, target, size };
}

function targetScrews(kind: GuidedKind, piece: PreparedPiece, count: number) {
  const { target, size } = piece;
  if (kind === 'laptop') {
    const x = Math.min(Math.max(size.x * 0.38, 0.28), 1.2);
    return [
      target.clone().add(new Vector3(-x, Math.max(size.y * 0.5, 0.07), 0)),
      target.clone().add(new Vector3(x, Math.max(size.y * 0.5, 0.07), 0)),
    ].slice(0, count);
  }
  const x = Math.min(Math.max(size.x * 0.4, 0.35), 1.45);
  const y = Math.min(Math.max(size.y * 0.4, 0.35), 1.45);
  const z = Math.max(size.z * 0.5, 0.06);
  return [
    target.clone().add(new Vector3(-x, -y, z)),
    target.clone().add(new Vector3(-x, y, z)),
    target.clone().add(new Vector3(x, -y, z)),
    target.clone().add(new Vector3(x, y, z)),
  ].slice(0, count);
}

function GuidedCamera({
  kind,
  command,
  mode,
  locked,
}: {
  kind: GuidedKind;
  command: GuidedCameraCommand;
  mode: GuidedCameraMode;
  locked: boolean;
}) {
  const controls = useRef<Controls>(null);
  const { camera } = useThree();
  const basePosition = useMemo(
    () => (kind === 'pc' ? new Vector3(5.8, 3.8, 10.8) : new Vector3(9, 11, 13)),
    [kind],
  );
  const baseTarget = useMemo(
    () => (kind === 'pc' ? new Vector3(0, -0.45, 0) : new Vector3(0, 2, 0)),
    [kind],
  );
  const goalPosition = useRef(basePosition.clone());
  const goalTarget = useRef(baseTarget.clone());
  useEffect(() => {
    if (mode === 'free') return;
    const target = command.target ? new Vector3(...command.target) : baseTarget.clone();
    goalTarget.current.copy(
      command.action === 'home' || command.action === 'front' ? baseTarget : target,
    );
    if (command.action === 'top') {
      goalPosition.current
        .copy(goalTarget.current)
        .add(new Vector3(0.01, kind === 'pc' ? 11 : 13, 0.01));
    } else if (command.action === 'focus' || command.action === 'screw') {
      goalPosition.current
        .copy(goalTarget.current)
        .add(kind === 'pc' ? new Vector3(3.8, 2.5, 5.8) : new Vector3(3.2, 6.2, 5));
    } else {
      goalPosition.current.copy(basePosition);
    }
  }, [basePosition, baseTarget, command, kind, mode]);
  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || mode === 'free') return;
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    camera.position.lerp(goalPosition.current, alpha);
    orbit.target.lerp(goalTarget.current, alpha);
    orbit.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!locked && mode === 'free'}
      target={baseTarget.toArray()}
      minDistance={2.2}
      maxDistance={35}
    />
  );
}

function MovingPiece({
  definition,
  prepared,
  props,
}: {
  definition: GuidedPieceDefinition;
  prepared: PreparedPiece;
  props: Props;
}) {
  const group = useRef<Group>(null);
  const drag = useRef<{ point: Vector3; offset: Vector3; plane: Plane } | null>(null);
  const controls = useThree((state) => state.controls as Controls | undefined);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const [dragging, setDragging] = useState(false);
  const progress = useRef(0);
  const completed = useRef(false);
  const previousReset = useRef(props.positionReset[definition.id]);
  const loose = props.loose.includes(definition.id);
  const installed = props.inserted.includes(definition.id);
  const fromInventory = props.inventoryPointer?.id === definition.id;
  const inserting = props.inserting === definition.id;

  useEffect(() => {
    if (!group.current || previousReset.current === props.positionReset[definition.id]) return;
    previousReset.current = props.positionReset[definition.id];
    group.current.position.set(...definition.tray);
    group.current.rotation.set(0, 0, 0);
    progress.current = 0;
    completed.current = false;
  }, [definition, props.positionReset]);

  useEffect(() => {
    if (!group.current || !fromInventory || !props.inventoryPointer?.inside) return;
    const rect = gl.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((props.inventoryPointer.clientX - rect.left) / rect.width) * 2 - 1,
      -((props.inventoryPointer.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const plane = new Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new Vector3()),
      prepared.target,
    );
    const point = raycaster.ray.intersectPlane(plane, new Vector3());
    if (point) group.current.position.copy(point);
  }, [camera, fromInventory, gl, prepared.target, props.inventoryPointer, raycaster]);

  useEffect(() => {
    if (!group.current) return;
    const quarter = props.rotations[definition.id] * (Math.PI / 2);
    if (props.kind === 'pc') group.current.rotation.z = quarter;
    else group.current.rotation.y = quarter;
  }, [definition.id, props.kind, props.rotations]);

  useFrame((_, delta) => {
    if (!group.current || !inserting || completed.current) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, 0.05) / 0.65);
    const t = progress.current;
    const eased = t * t * (3 - 2 * t);
    group.current.position.lerp(prepared.target, Math.min(1, eased * 0.28 + 0.08));
    group.current.rotation.x *= 1 - Math.min(1, eased * 0.35);
    group.current.rotation.y *= 1 - Math.min(1, eased * 0.35);
    group.current.rotation.z *= 1 - Math.min(1, eased * 0.35);
    if (t === 1) {
      group.current.position.copy(prepared.target);
      group.current.rotation.set(0, 0, 0);
      completed.current = true;
      props.onInsertionComplete(definition.id);
    }
  });

  function down(event: ThreeEvent<PointerEvent>) {
    if (!loose || installed || inserting || !group.current) return;
    event.stopPropagation();
    drag.current = {
      point: event.point.clone(),
      offset: group.current.position.clone(),
      plane: new Plane().setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new Vector3()),
        event.point,
      ),
    };
    (event.target as Element).setPointerCapture(event.pointerId);
    if (controls) controls.enabled = false;
    setDragging(true);
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
    (event.target as Element).releasePointerCapture(event.pointerId);
    if (controls) controls.enabled = props.cameraMode === 'free';
    setDragging(false);
    const rotationOk = props.rotations[definition.id] % 4 === 0;
    const distance = group.current.position.distanceTo(prepared.target);
    const aligned = rotationOk && distance <= definition.tolerance;
    props.onPlacement(
      definition.id,
      aligned,
      aligned
        ? `${definition.name}: alineación correcta. Pulsa Insertar.`
        : !rotationOk
          ? `${definition.name}: corrige la orientación antes de insertar.`
          : `${definition.name}: acércala al destino iluminado.`,
    );
  }

  if (!loose && !installed && !fromInventory) return null;
  return (
    <group
      ref={group}
      position={installed ? prepared.target : definition.tray}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
        if (controls) controls.enabled = props.cameraMode === 'free';
      }}
    >
      <primitive object={prepared.object} />
      {(dragging || fromInventory) && (
        <Html position={[0, prepared.size.y * 0.6 + 0.25, 0]} center>
          <span className="guided-drag-label">
            {fromInventory ? 'Suelta dentro del visor' : 'Alinea con el destino'}
          </span>
        </Html>
      )}
    </group>
  );
}

function Screw({
  definition,
  prepared,
  index,
  target,
  props,
}: {
  definition: GuidedPieceDefinition;
  prepared: PreparedPiece;
  index: number;
  target: Vector3;
  props: Props;
}) {
  const { scene } = useGLTF(fanScrewPath);
  const object = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<Group>(null);
  const controls = useThree((state) => state.controls as Controls | undefined);
  const camera = useThree((state) => state.camera);
  const drag = useRef<{ point: Vector3; offset: Vector3; plane: Plane } | null>(null);
  const progress = useRef(0);
  const completed = useRef(false);
  const placed = props.screws[definition.id]?.[index];
  const active = props.screwBusy?.piece === definition.id && props.screwBusy.index === index;
  const available = props.inserted.includes(definition.id) && !placed && !active;
  const tray = useMemo(() => {
    if (props.kind === 'pc')
      return prepared.target
        .clone()
        .add(new Vector3(prepared.size.x * 0.6 + 1, (index - 1.5) * 0.42, 1.2));
    return prepared.target.clone().add(new Vector3((index - 0.5) * 0.65, 1.5, 1.4));
  }, [index, prepared, props.kind]);
  useEffect(() => {
    if (group.current && available) group.current.position.copy(tray);
  }, [available, tray]);
  useFrame((_, delta) => {
    if (!group.current || !active || completed.current) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, 0.05) / 0.55);
    group.current.position.lerp(target, 0.18);
    group.current.rotation.z += delta * 18;
    if (progress.current === 1) {
      completed.current = true;
      props.onScrewComplete(definition.id, index);
    }
  });
  function down(event: ThreeEvent<PointerEvent>) {
    if (!available || !group.current || props.screwBusy) return;
    event.stopPropagation();
    drag.current = {
      point: event.point.clone(),
      offset: group.current.position.clone(),
      plane: new Plane().setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new Vector3()),
        event.point,
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
    (event.target as Element).releasePointerCapture(event.pointerId);
    if (controls) controls.enabled = props.cameraMode === 'free';
    if (group.current.position.distanceTo(target) <= 0.55) props.onScrew(definition.id, index);
    else {
      group.current.position.copy(tray);
      props.onScrewRejected(definition.id, index);
    }
  }
  if (placed) {
    return (
      <group position={target} scale={6}>
        <primitive object={object} />
      </group>
    );
  }
  if (!available && !active) return null;
  return (
    <group
      ref={group}
      position={tray}
      scale={6}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <primitive object={object} />
      <Html center position={[0, 0.02, 0]}>
        <span className="guided-screw-label">{index + 1}</span>
      </Html>
    </group>
  );
}

function AssemblyModels({
  props,
  base,
  prepared,
}: {
  props: Props;
  base: Group;
  prepared: Record<GuidedPieceId, PreparedPiece>;
}) {
  const selectedPiece = prepared[props.selected];
  const definitions = guidedPieces[props.kind];
  return (
    <>
      <primitive object={base} />
      {definitions.map((definition) => {
        const piece = prepared[definition.id];
        const targets = targetScrews(props.kind, piece, definition.screws);
        return (
          <group key={definition.id}>
            <MovingPiece definition={definition} prepared={piece} props={props} />
            {targets.map((target, index) => (
              <Screw
                key={index}
                definition={definition}
                prepared={piece}
                index={index}
                target={target}
                props={props}
              />
            ))}
          </group>
        );
      })}
      {selectedPiece && !props.inserted.includes(props.selected) && (
        <mesh position={selectedPiece.target}>
          <boxGeometry args={selectedPiece.size.clone().addScalar(0.12).toArray()} />
          <meshBasicMaterial
            color="#63dcff"
            wireframe
            transparent
            opacity={0.72}
            depthTest={false}
          />
        </mesh>
      )}
      {selectedPiece && props.inserted.includes(props.selected) && (
        <group>
          {targetScrews(
            props.kind,
            selectedPiece,
            guidedPieces[props.kind].find((p) => p.id === props.selected)!.screws,
          ).map((target, index) =>
            !props.screws[props.selected]?.[index] ? (
              <mesh key={index} position={target}>
                <torusGeometry args={[0.16, 0.035, 10, 24]} />
                <meshBasicMaterial color="#58dcff" transparent opacity={0.9} depthTest={false} />
              </mesh>
            ) : null,
          )}
        </group>
      )}
    </>
  );
}

function PcModels(props: Props) {
  const { scene } = useGLTF(pcModel.path);
  const { groups } = useMemo(() => preparePcModel(scene), [scene]);
  const prepared = useMemo(() => {
    const result = {} as Record<GuidedPieceId, PreparedPiece>;
    for (const definition of guidedPieces.pc)
      result[definition.id] = centerPiece(groups[definition.sourceId as PcGroupId]);
    return result;
  }, [groups]);
  const base = useMemo(() => {
    const group = new Group();
    group.add(groups.chassis.clone(true));
    group.add(groups.standoffs.clone(true));
    return group;
  }, [groups]);
  return <AssemblyModels props={props} base={base} prepared={prepared} />;
}

function LaptopModels(props: Props) {
  const { scene } = useGLTF(laptopModelPath);
  const { pieces } = useMemo(() => prepareAssemblyLaptop(scene), [scene]);
  const prepared = useMemo(() => {
    const result = {} as Record<GuidedPieceId, PreparedPiece>;
    for (const definition of guidedPieces.laptop)
      result[definition.id] = centerPiece(pieces[definition.sourceId as keyof typeof pieces]);
    return result;
  }, [pieces]);
  const base = useMemo(() => {
    const group = new Group();
    group.add(pieces.base.clone(true));
    group.add(pieces.motherboard.clone(true));
    group.add(pieces.screen.clone(true));
    return group;
  }, [pieces]);
  return <AssemblyModels props={props} base={base} prepared={prepared} />;
}

export function GuidedAssemblyScene(props: Props) {
  const locked = !!props.inserting || !!props.screwBusy || !!props.inventoryPointer;
  const camera = props.kind === 'pc' ? ([5.8, 3.8, 10.8] as const) : ([9, 11, 13] as const);
  return (
    <Canvas camera={{ position: camera, fov: 40, near: 0.02, far: 80 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#102238']} />
      <hemisphereLight args={['#ffffff', '#61788f', 1.2]} />
      <directionalLight position={[5, 9, 7]} intensity={1.5} />
      <directionalLight position={[-5, 4, 2]} intensity={0.7} color="#65d8ff" />
      <GuidedCamera
        kind={props.kind}
        command={props.cameraCommand}
        mode={props.cameraMode}
        locked={locked}
      />
      <Suspense
        fallback={
          <Html center>
            <Global3DLoader variant={props.kind} compact />
          </Html>
        }
      >
        {props.kind === 'pc' ? <PcModels {...props} /> : <LaptopModels {...props} />}
      </Suspense>
      <gridHelper args={[30, 30, '#2d668c', '#24445f']} position={[0, -0.08, 0]} />
    </Canvas>
  );
}

useGLTF.preload(pcModel.path);
useGLTF.preload(laptopModelPath);
useGLTF.preload(fanScrewPath);
