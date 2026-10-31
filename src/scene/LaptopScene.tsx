import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, Plane, SRGBColorSpace, Vector3 } from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import { laptopModelPath, laptopPartById } from '../data/laptop';
import { laptopIssues, type LaptopAssembly, type LaptopPartId } from '../domain/laptop';
import { prepareAssemblyLaptop } from './prepareAssemblyLaptop';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Global3DLoader } from '../components/ui/Global3DLoader';
import { ManualPlacement } from './ManualPlacement';
import { fastenersFrom } from './manualGeometry';
import { largestFaceNormal } from './placementFrame';

export type LaptopView = 'home' | 'top' | 'bottom' | 'in' | 'out' | 'focus' | 'left' | 'right';
export interface LaptopCameraCommand {
  type: LaptopView;
  serial: number;
}
interface Props {
  dragEnabled?: boolean;
  onManualComplete?: (ids: LaptopPartId[]) => void;
  onManualActivity?: (active: boolean) => void;
  assembly: LaptopAssembly;
  selected: LaptopPartId;
  highlight: boolean;
  busy: LaptopPartId | null;
  interior: boolean;
  powered: boolean;
  booted: boolean;
  command: LaptopCameraCommand;
  onInstall: (id: LaptopPartId) => void;
  onInstalled: (id: LaptopPartId) => void;
}
function Models(props: Props) {
  const { scene } = useGLTF(laptopModelPath);
  const { pieces, positions } = useMemo(() => prepareAssemblyLaptop(scene), [scene]);
  const manualObject = useMemo(() => pieces[props.selected].clone(true), [pieces, props.selected]);
  const rotationAxis = useMemo(
    () => (props.selected === 'screen' ? largestFaceNormal(pieces.screen) : undefined),
    [pieces, props.selected],
  );
  const screws = useMemo(() => fastenersFrom(pieces.screws), [pieces]);
  const wallpaper = useTexture('/images/windows11-laptop-assembly.png');
  const screenTexture = useMemo(() => {
    const texture = wallpaper.clone();
    texture.colorSpace = SRGBColorSpace;
    // Cover the 33.3 x 21.5 display without stretching the 4:3 artwork.
    const visibleHeight = 1448 / 1086 / (33.3 / 21.5);
    texture.repeat.set(1, visibleHeight);
    texture.offset.set(0, (1 - visibleHeight) / 2);
    texture.needsUpdate = true;
    return texture;
  }, [wallpaper]);
  useEffect(() => {
    pieces.screen.traverse((object) => {
      if (!(object instanceof Mesh) || !object.userData.laptopDisplay) return;
      const material = object.material as MeshStandardMaterial;
      material.map = props.powered && props.booted ? screenTexture : null;
      material.emissiveMap = props.powered && props.booted ? screenTexture : null;
      material.color.set(props.powered && props.booted ? '#ffffff' : '#10151b');
      material.emissive.set(props.powered && props.booted ? '#ffffff' : '#000000');
      material.emissiveIntensity = 0.85;
      material.toneMapped = !props.powered;
      material.needsUpdate = true;
    });
  }, [pieces, props.powered, props.booted, screenTexture]);
  useEffect(() => () => screenTexture.dispose(), [screenTexture]);
  const controls = useRef<Controls>(null);
  const moving = useRef<Group>(null);
  const progress = useRef(0);
  const finished = useRef(false);
  const drag = useRef<{ start: Vector3; offset: Vector3; plane: Plane } | null>(null);
  const [dragging, setDragging] = useState(false);
  const { camera } = useThree();
  const cameraGoal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const target = positions[props.selected];
  const installed = props.assembly.installed.includes(props.selected);
  const available =
    !installed && !props.powered && !laptopIssues(props.assembly, props.selected).length;
  useEffect(() => {
    if (!moving.current) return;
    moving.current.position.set(0, 2, 0);
    progress.current = 0;
    finished.current = false;
  }, [props.selected, props.busy]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const type = props.command.type;
    cameraGoal.current = null;
    if (type === 'left' || type === 'right') {
      camera.position
        .sub(orbit.target)
        .applyAxisAngle(new Vector3(0, 1, 0), type === 'left' ? 0.35 : -0.35)
        .add(orbit.target);
    } else if (type === 'in' || type === 'out') {
      camera.position
        .sub(orbit.target)
        .multiplyScalar(type === 'in' ? 0.8 : 1.25)
        .clampLength(3, 30)
        .add(orbit.target);
    } else {
      const nextTarget = type === 'focus' ? target.clone() : new Vector3(0, 2, 0);
      const offset =
        type === 'top'
          ? new Vector3(0, 14, 0.01)
          : type === 'bottom'
            ? new Vector3(0, -12, 4)
            : type === 'focus'
              ? new Vector3(0, 10, 2.8)
              : new Vector3(9, 10, 13);
      cameraGoal.current = { target: nextTarget, position: nextTarget.clone().add(offset) };
    }
    orbit.update();
    // Selection alone does not move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.command.serial, camera]);
  useFrame((_, delta) => {
    if (cameraGoal.current && controls.current) {
      const t = 1 - Math.exp(-Math.min(delta, 0.05) * 9);
      camera.position.lerp(cameraGoal.current.position, t);
      controls.current.target.lerp(cameraGoal.current.target, t);
      controls.current.update();
      if (camera.position.distanceTo(cameraGoal.current.position) < 0.005)
        cameraGoal.current = null;
    }
    if (!props.busy || !moving.current || finished.current) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, 0.05) / 0.7);
    const t = progress.current;
    moving.current.position.multiplyScalar(1 - t * t * (3 - 2 * t));
    if (t === 1) {
      finished.current = true;
      props.onInstalled(props.busy);
    }
  });
  function down(e: ThreeEvent<PointerEvent>) {
    if (!available || props.busy || !moving.current) return;
    e.stopPropagation();
    const plane = new Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new Vector3()),
      e.point,
    );
    drag.current = { start: e.point.clone(), offset: moving.current.position.clone(), plane };
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function move(e: ThreeEvent<PointerEvent>) {
    if (!drag.current || !moving.current) return;
    e.stopPropagation();
    const point = e.ray.intersectPlane(drag.current.plane, new Vector3());
    if (point) moving.current.position.copy(point.sub(drag.current.start).add(drag.current.offset));
  }
  function up(e: ThreeEvent<PointerEvent>) {
    if (!drag.current || !moving.current) return;
    e.stopPropagation();
    drag.current = null;
    setDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
    if (moving.current.position.length() < 0.9) props.onInstall(props.selected);
    else moving.current.position.set(0, 2, 0);
  }
  return (
    <>
      <OrbitControls
        ref={controls}
        enabled={!dragging}
        makeDefault
        onStart={() => {
          cameraGoal.current = null;
        }}
        target={[0, 2, 0]}
        minDistance={3}
        maxDistance={30}
      />
      {props.assembly.installed.map((id) => {
        if (
          props.interior &&
          [
            'lowerCover',
            'keyboard',
            'touchpad',
            'internalCover',
            'keyboardConnector',
            'screws',
          ].includes(id)
        )
          return null;
        return <primitive key={id} object={pieces[id]} />;
      })}
      {props.selected !== 'screws' &&
        (!props.dragEnabled || !!props.busy) &&
        (available || props.busy === props.selected) && (
          <group
            ref={moving}
            position={[0, 2, 0]}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(false);
              moving.current?.position.set(0, 2, 0);
            }}
          >
            <primitive object={pieces[props.selected]} />
          </group>
        )}
      {(props.dragEnabled || props.selected === 'screws') &&
        !installed &&
        !props.busy &&
        !props.powered && (
          <ManualPlacement
            key={props.selected}
            object={manualObject}
            token={'laptop:' + props.selected}
            name={laptopPartById(props.selected).name}
            axis="y"
            rotationAxis={rotationAxis}
            blocked={laptopIssues(props.assembly, props.selected).join(' ')}
            fasteners={
              props.selected === 'lowerCover' || props.selected === 'screws' ? screws : undefined
            }
            fastenersOnly={props.selected === 'screws'}
            onActivity={(active) => props.onManualActivity?.(active)}
            onComplete={() =>
              props.onManualComplete?.(
                props.selected === 'lowerCover' ? ['lowerCover', 'screws'] : [props.selected],
              )
            }
          />
        )}
      {!props.dragEnabled && props.highlight && !props.busy && !props.powered && (
        <Html position={target.clone().add(new Vector3(0, 0.4, 0))} center>
          <span className="laptop-location-tag">
            {laptopPartById(props.selected).name}
            {installed ? ' · instalada' : ' · destino'}
          </span>
        </Html>
      )}
    </>
  );
}
export function LaptopScene(props: Props) {
  return (
    <ErrorBoundary
      fallback={<div role="alert">No se pudo cargar la laptop. Recarga para reintentar.</div>}
    >
      <Canvas camera={{ position: [9, 12, 13], fov: 39, near: 0.05, far: 100 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#142438']} />
        <hemisphereLight args={['#ffffff', '#8499b0', 1.1]} />
        <directionalLight position={[3, 10, 6]} intensity={1.4} />
        <directionalLight position={[-6, 5, -4]} intensity={0.6} />
        <Suspense
          fallback={
            <Html center>
              <Global3DLoader variant="laptop" compact />
            </Html>
          }
        >
          <Models {...props} />
        </Suspense>
        <gridHelper args={[30, 30, '#294963', '#21354a']} position={[0, -0.06, 0]} />
      </Canvas>
    </ErrorBoundary>
  );
}
