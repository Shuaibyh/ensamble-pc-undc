import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import { prepareAssemblyLaptop } from '../scene/prepareAssemblyLaptop';
import { laptopNodes, laptopParts } from '../data/laptop';
import type { LaptopPartId } from './laptop';

test('modelo real: piezas completas, escala y orientación, originales intactos', async () => {
  const bytes = readFileSync(
    new URL('../../public/models/laptops/laptop_assembly.glb', import.meta.url),
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const before = gltf.scene.toJSON();
  const { pieces } = prepareAssemblyLaptop(gltf.scene);
  const sourceBase = gltf.scene.getObjectByName(laptopNodes.base!)!;
  const commonTransform = pieces.base.children[0].matrixWorld
    .clone()
    .multiply(sourceBase.matrixWorld.clone().invert());
  for (const [id, name] of Object.entries(laptopNodes)) {
    const piece = pieces[id as LaptopPartId];
    const original = gltf.scene.getObjectByName(name)!;
    const expected = new Matrix4().multiplyMatrices(commonTransform, original.matrixWorld);
    const actual = piece.children[0];
    const assertPosition = () =>
      expected.elements.forEach((value, index) =>
        assert.ok(Math.abs(value - actual.matrixWorld.elements[index]) < 1e-8, id),
      );
    assertPosition();
    // Moving and snapping the wrapper must restore the full original transform,
    // including negative/nonuniform scales, without shifting another component.
    const baseMatrix = pieces.base.children[0].matrixWorld.clone();
    piece.position.set(1, 2, -1);
    piece.updateMatrixWorld(true);
    if (id !== 'base') assert.ok(pieces.base.children[0].matrixWorld.equals(baseMatrix));
    piece.position.set(0, 0, 0);
    piece.updateMatrixWorld(true);
    assertPosition();
  }
  for (const part of laptopParts) {
    const box = new Box3().setFromObject(pieces[part.id]);
    assert.ok(!box.isEmpty(), part.id);
    assert.ok(box.min.toArray().every(Number.isFinite), part.id);
  }
  let displays = 0;
  pieces.screen.traverse((object) => {
    if (!(object instanceof Mesh) || !object.userData.laptopDisplay) return;
    displays++;
    const uv = object.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1);
      assert.ok(uv.getY(i) >= 0 && uv.getY(i) <= 1);
    }
  });
  assert.equal(displays, 1);
  const screen = new Box3().setFromObject(pieces.screen);
  const base = new Box3().setFromObject(pieces.base);
  assert.ok(screen.max.y > base.max.y + 3);
  assert.ok(Math.abs(screen.getSize(new Vector3()).x - 8) < 0.1);
  assert.deepEqual(gltf.scene.toJSON(), before);
});
