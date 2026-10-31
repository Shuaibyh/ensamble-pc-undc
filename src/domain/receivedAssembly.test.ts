import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Texture, Vector3 } from 'three';
import { receivedModels } from '../data/receivedModels';
import { boardGroups, changeBoardGroup, type BoardGroup } from './receivedAssembly';

test('placa recibida: dependencias, duplicados y retirada', () => {
  assert.ok(changeBoardGroup([], 'CPU', true).error);
  assert.ok(changeBoardGroup(['MotherBoard'], 'MotherBoard', true).error);
  assert.ok(changeBoardGroup(['MotherBoard', 'CPU'], 'MotherBoard', false).error);
  assert.ok(changeBoardGroup([], 'CPU', false).error);
  let installed: BoardGroup[] = [];
  for (const { id } of boardGroups) installed = changeBoardGroup(installed, id, true).installed!;
  assert.equal(installed.length, 7);
  for (const { id } of [...boardGroups].reverse())
    installed = changeBoardGroup(installed, id, false).installed!;
  assert.deepEqual(installed, []);
});

for (const asset of receivedModels) {
  test(`geometría GLB disponible: ${asset.name}`, async () => {
    const bytes = await readFile(new URL(`../../public${asset.modelPath}`, import.meta.url));
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    // Prueba de geometría sin navegador: no decodifica imágenes ni verifica WebGL.
    loader.register(() => ({
      name: 'test-skip-textures',
      loadTexture: () => Promise.resolve(new Texture()),
    }));
    const gltf = await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    );
    gltf.scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(gltf.scene);
    assert.ok(!bounds.isEmpty());
    assert.ok(Number.isFinite(bounds.getSize(new Vector3()).length()));
    if (asset.id === 'motherboard') {
      for (const { id } of boardGroups) {
        const group = gltf.scene.getObjectByName(id);
        assert.ok(group, id);
        const partBounds = new Box3().setFromObject(group);
        assert.ok(!partBounds.isEmpty(), id);
      }
    }
  });
}
