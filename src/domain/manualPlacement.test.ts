import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  Box3,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Ray,
  Raycaster,
  Texture,
  Vector2,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { alignment, allFastenersPlaced, rotationStep } from './manualPlacement';
import { fastenersFrom } from '../scene/manualGeometry';
import { preparePcModel } from '../scene/preparePcModel';
import { prepareAssemblyLaptop } from '../scene/prepareAssemblyLaptop';
import { newSession, sessionReducer } from './session';
import {
  createPlacementFrame,
  largestFaceNormal,
  placementDragPlane,
  placementRayHit,
} from '../scene/placementFrame';
import { ghostOf } from '../scene/manualGeometry';

test('alineación independiente de cámara: ambos planos, ambos giros, vueltas completas e inválidos', () => {
  for (const normal of [new Vector3(1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0)]) {
    const target = new Vector3(2, 3, 4);
    const rotation = (angle: number) => new Quaternion().setFromAxisAngle(normal, angle);
    const installedRotation = new Quaternion();
    assert.equal(
      alignment(target, target, rotation(Math.PI / 4), installedRotation, 0.2).orientationOk,
      false,
    );
    assert.equal(
      alignment(
        target.clone().add(new Vector3(0.4, 0, 0)),
        target,
        rotation(0),
        installedRotation,
        0.2,
      ).positionOk,
      false,
    );
    assert.equal(
      alignment(
        target.clone().addScaledVector(normal, 0.55),
        target,
        rotation(0),
        installedRotation,
        0.2,
      ).positionOk,
      false,
      'rechaza la profundidad que antes se ignoraba',
    );
    let angle = Math.PI / 4;
    angle += rotationStep;
    assert.equal(
      alignment(target, target, rotation(angle), installedRotation, 0.2).orientationOk,
      false,
    );
    for (let i = 0; i < 4; i++) angle -= rotationStep;
    assert.equal(
      alignment(target, target, rotation(angle), installedRotation, 0.2).orientationOk,
      true,
    );
    assert.equal(
      alignment(target, target, rotation(-4 * Math.PI), installedRotation, 0.2).orientationOk,
      true,
    );
  }
  const arbitraryTarget = new Quaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), 0.7);
  assert.equal(
    alignment(new Vector3(), new Vector3(), arbitraryTarget, arbitraryTarget, 0.1).orientationOk,
    true,
  );
  assert.equal(
    alignment(new Vector3(), new Vector3(), new Quaternion(), arbitraryTarget, 0.1).orientationOk,
    false,
  );
});

test('fijaciones completas: ni duplicados ni índices incorrectos completan el montaje', () => {
  assert.equal(allFastenersPlaced(4, [0, 1, 1, 2]), false);
  assert.equal(allFastenersPlaced(4, [0, 1, 2, 4]), false);
  assert.equal(allFastenersPlaced(4, [0, 1, 2, 3]), true);
  assert.equal(allFastenersPlaced(0, []), false);
});

async function load(path: string) {
  const bytes = await readFile(new URL('../../public' + path, import.meta.url));
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.register(() => ({
    name: 'test-textures',
    loadTexture: () => Promise.resolve(new Texture()),
  }));
  return (
    await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene;
}
function triangleCount(group: Group) {
  let count = 0;
  group.traverse((o) => {
    if (o instanceof Mesh)
      count += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  return count;
}
test('tornillos GLB individuales conservan toda la geometría y sus destinos; pivote manual vuelve exactamente al original', async () => {
  const pc = preparePcModel(await load('/models/creagal/desktop.glb'));
  const laptop = prepareAssemblyLaptop(await load('/models/laptops/laptop_assembly.glb'));
  for (const [original, combined, expected] of [
    [pc.groups['board-screws'], true, 9],
    [laptop.pieces.screws, false, 18],
  ] as const) {
    const pieces = fastenersFrom(original, combined);
    assert.equal(pieces.length, expected, 'cantidad de tornillos del archivo original');
    assert.equal(
      pieces.reduce((sum, p) => sum + triangleCount(p), 0),
      triangleCount(original),
    );
    const reunited = new Group();
    pieces.forEach((p) => reunited.add(p));
    const expectedBounds = new Box3().setFromObject(original);
    const actualBounds = new Box3().setFromObject(reunited);
    assert.ok(actualBounds.min.distanceTo(expectedBounds.min) < 1e-6);
    assert.ok(actualBounds.max.distanceTo(expectedBounds.max) < 1e-6);
  }
  for (const original of [...Object.values(pc.groups), ...Object.values(laptop.pieces)]) {
    const object = original.clone(true);
    object.updateMatrixWorld(true);
    const before = new Map<string, number[]>();
    object.traverse((o) => {
      if (o instanceof Mesh) before.set(o.uuid, o.matrixWorld.elements.slice());
    });
    const center = new Box3().setFromObject(object).getCenter(new Vector3());
    const pivot = new Group();
    const offset = new Group();
    offset.position.copy(center).negate();
    offset.add(object);
    pivot.add(offset);
    pivot.position.copy(center).add(new Vector3(1, 2, 3));
    pivot.rotation.y = Math.PI / 2;
    pivot.updateMatrixWorld(true);
    pivot.position.copy(center);
    pivot.rotation.set(0, 0, 0);
    pivot.updateMatrixWorld(true);
    object.traverse((o) => {
      if (o instanceof Mesh)
        before
          .get(o.uuid)!
          .forEach((v, i) => assert.ok(Math.abs(v - o.matrixWorld.elements[i]) < 1e-8));
    });
  }
});

test('confirmación manual conserva el progreso original y no deja animación clásica pendiente', () => {
  let session = newSession();
  for (const id of ['standoffs', 'board', 'board-screws', 'cpu', 'ram', 'gpu'] as const) {
    session = sessionReducer(session, { type: 'command', action: { type: 'install', id } });
    session = sessionReducer(session, { type: 'finish', id });
    assert.ok(session.assembly.installed.includes(id));
    assert.equal(session.busy, null);
  }
  assert.equal(session.assembly.installed.length, 6);
});

test('todos los GLB: silueta e instalación comparten destino, giro sobre centro propio y orientación original intacta', async () => {
  const pc = preparePcModel(await load('/models/creagal/desktop.glb'));
  const laptop = prepareAssemblyLaptop(await load('/models/laptops/laptop_assembly.glb'));
  const frames = [
    ...Object.entries(pc.groups)
      .filter(([id]) =>
        ['standoffs', 'board', 'cpu', 'ram', 'gpu', 'cooler', 'psu', 'ssd', 'fan-rear'].includes(
          id,
        ),
      )
      .map(([id, object]) => ({
        name: 'pc:' + id,
        object,
        axis: id === 'cooler' ? new Vector3(0, 0, 1) : undefined,
      })),
    ...Object.entries(laptop.pieces)
      .filter(([id]) => !['base', 'screws'].includes(id))
      .map(([id, object]) => ({
        name: 'laptop:' + id,
        object,
        axis: id === 'screen' ? largestFaceNormal(object) : undefined,
      })),
  ];
  for (const { name, object, axis } of frames) {
    const sourceBefore = object.toJSON();
    const frame = createPlacementFrame(object, axis);
    const root = new Group();
    root.position.set(2, -1, 3);
    root.rotation.set(0.3, -0.4, 0.2);
    root.scale.set(1.5, 0.8, -1.1);
    const pivot = new Group();
    pivot.add(frame.centered);
    root.add(pivot);
    const ghost = ghostOf(frame.centered);
    const destination = new Group();
    destination.position.copy(frame.target.position);
    destination.quaternion.copy(frame.target.quaternion);
    destination.add(ghost.object);
    // The marker is the origin of exactly the same destination group as the ghost.
    const marker = new Group();
    destination.add(marker);
    root.add(destination);
    const source = object.clone(true);
    root.add(source);
    root.updateMatrixWorld(true);
    const expected = new Map<string, Matrix4>();
    source.traverse((mesh) => {
      if (mesh instanceof Mesh) expected.set(mesh.name, mesh.matrixWorld.clone());
    });
    for (const angle of [-Math.PI / 2, -rotationStep, 0, rotationStep, Math.PI / 2]) {
      pivot.position.copy(frame.target.position);
      pivot.quaternion
        .setFromAxisAngle(frame.rotationAxis, angle)
        .multiply(frame.target.quaternion);
      root.updateMatrixWorld(true);
      const center = frame.target.position.clone();
      const model = frame.centered.children[0];
      const rotatedCenter = model.localToWorld(
        center.clone().applyMatrix4(model.matrix.clone().invert()),
      );
      assert.ok(
        rotatedCenter.distanceTo(pivot.getWorldPosition(new Vector3())) < 1e-8,
        name + ': centro estable al girar',
      );
    }
    pivot.position.copy(frame.target.position);
    pivot.quaternion.copy(frame.target.quaternion);
    root.updateMatrixWorld(true);
    assert.ok(
      marker.getWorldPosition(new Vector3()).distanceTo(pivot.getWorldPosition(new Vector3())) <
        1e-8,
      name + ': círculo centrado',
    );
    for (const instance of [frame.centered, ghost.object])
      instance.traverse((mesh) => {
        if (mesh instanceof Mesh)
          expected
            .get(mesh.name)!
            .elements.forEach((v, i) =>
              assert.ok(
                Math.abs(v - mesh.matrixWorld.elements[i]) < 1e-7,
                name + ': matriz final = GLB',
              ),
            );
      });
    assert.deepEqual(object.toJSON(), sourceBefore, name + ': recurso original intacto');
    ghost.material.dispose();
  }
  assert.ok(
    createPlacementFrame(pc.groups.psu).target.position.y >
      createPlacementFrame(pc.groups.board).target.position.y,
    'fuente superior según GLB actual',
  );
  for (const [object, normal] of [
    [pc.groups.board, new Vector3(0, 0, 1)],
    [pc.groups.ram, new Vector3(1, 0, 0)],
    [pc.groups.gpu, new Vector3(0, 1, 0)],
    [pc.groups['fan-rear'], new Vector3(1, 0, 0)],
  ] as const)
    assert.ok(createPlacementFrame(object).rotationAxis.distanceTo(normal) < 1e-8);
  const screenNormal = largestFaceNormal(laptop.pieces.screen);
  assert.ok(
    Math.abs(screenNormal.z) > 0.8 && Math.abs(screenNormal.y) > 0.05,
    'pantalla inclinada usa su cara real',
  );
});

test('rayos y anclaje coinciden desde cámaras frontal, superior, lateral, zoom y tamaños distintos', () => {
  const target = new Vector3(-1.5, 0.3, -0.6);
  const parent = new Matrix4().compose(
    new Vector3(2, 1, -1),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.3),
    new Vector3(2, 0.8, -1),
  );
  const worldTarget = target.clone().applyMatrix4(parent);
  for (const offset of [
    new Vector3(0, 0, 10),
    new Vector3(9, 1, 0),
    new Vector3(0, 10, 0.01),
    new Vector3(-6, -3, -5),
  ]) {
    for (const [width, height] of [
      [1280, 720],
      [700, 1000],
      [400, 400],
    ]) {
      for (const zoom of [0.7, 1.8]) {
        for (const camera of [
          new PerspectiveCamera(42, width / height, 0.05, 100),
          new OrthographicCamera(-6, 6, 6, -6, 0.05, 100),
        ]) {
          camera.position.copy(worldTarget).add(offset);
          camera.lookAt(worldTarget);
          camera.zoom = zoom;
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
          const ndc = worldTarget.clone().project(camera);
          const clientX = ((ndc.x + 1) * width) / 2 + 31;
          const clientY = ((1 - ndc.y) * height) / 2 + 57;
          const ray = new Raycaster();
          ray.setFromCamera(
            new Vector2(((clientX - 31) / width) * 2 - 1, (-(clientY - 57) / height) * 2 + 1),
            camera,
          );
          const plane = placementDragPlane(target, parent, camera.getWorldDirection(new Vector3()));
          const hit = placementRayHit(ray.ray, plane, parent)!;
          assert.ok(
            hit.distanceTo(target) < 1e-8,
            'mismo destino, independiente de cámara/viewport',
          );
          assert.ok(alignment(hit, target, new Quaternion(), new Quaternion(), 0.05).positionOk);
          const wrong = hit.clone().add(new Vector3(0, 0, 2));
          assert.equal(
            alignment(wrong, target, new Quaternion(), new Quaternion(), 0.05).positionOk,
            false,
          );
        }
      }
    }
  }
  assert.equal(
    placementRayHit(
      new Ray(new Vector3(), new Vector3(1, 0, 0)),
      placementDragPlane(target, new Matrix4(), new Vector3(0, 0, 1)),
      new Matrix4(),
    ),
    null,
  );
});

test('pivote GLB desplazado y grupos anidados no cambian el destino ni la orientación final', () => {
  const object = new Group();
  object.position.set(12, -3, 8);
  object.rotation.set(0.2, 0.8, -0.5);
  const nested = new Group();
  nested.position.set(-5, 7, 2);
  nested.scale.set(-2, 0.7, 1.4);
  const mesh = new Mesh(new BoxGeometry(1, 2, 3), new MeshBasicMaterial());
  mesh.position.set(4, 5, -8);
  nested.add(mesh);
  object.add(nested);
  object.updateMatrixWorld(true);
  const expected = mesh.matrixWorld.clone();
  const frame = createPlacementFrame(object);
  const pivot = new Group();
  pivot.add(frame.centered);
  pivot.position.copy(frame.target.position);
  pivot.quaternion.copy(frame.target.quaternion);
  pivot.updateMatrixWorld(true);
  frame.centered.traverse((child) => {
    if (child instanceof Mesh)
      expected.elements.forEach((v, i) =>
        assert.ok(Math.abs(v - child.matrixWorld.elements[i]) < 1e-8),
      );
  });
  mesh.geometry.dispose();
  (mesh.material as MeshBasicMaterial).dispose();
});
