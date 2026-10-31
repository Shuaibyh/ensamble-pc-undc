import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { prepareReceivedCase } from '../scene/prepareReceivedCase';

test('el GLB publicado conserva el archivo recibido y puede analizarse con Three.js', async () => {
  const bytes = await readFile(
    new URL('../../public/models/cases/nightshark.glb', import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    '48bc297aafff9566cbe7ad4450370d834fce2e661186eaff3e5cab11088a1f33',
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const prepared = prepareReceivedCase(gltf.scene);
  assert.equal(prepared.windows.length, 1);
  assert.equal(prepared.materials.length, 6);
  for (const { material, original } of prepared.materials) assert.notEqual(material, original);
  prepared.windows[0].visible = false;
  assert.equal(gltf.scene.getObjectByName(prepared.windows[0].name)?.visible, true);
  const group = new Group();
  group.scale.setScalar(prepared.scale);
  group.position.copy(prepared.position);
  group.add(prepared.scene);
  group.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(group);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - 5) < 0.0001);
  assert.ok(bounds.getCenter(new Vector3()).length() < 0.0001);
});

test('un recurso sin geometría se rechaza para activar el estado de error', () => {
  assert.throws(() => prepareReceivedCase(new Group()), /sin geometría/);
});
