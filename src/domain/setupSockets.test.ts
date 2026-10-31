import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Group, Matrix4, Mesh, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import anchors from '../data/setupSocketAnchors.json';
import { preparePcModel } from '../scene/preparePcModel';
import { preparePeripheralModel } from '../scene/preparePeripheralModel';
import { resolveSocketFrame, plugMatrix, type SocketId } from '../scene/setupSockets';
import { peripherals } from '../data/peripherals';

test('real GLB sockets keep tip contact, insertion axis and shoulder contact under parent transforms', async () => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.register(() => ({
    name: 'test-textures',
    loadTexture: () => Promise.resolve(new Texture()),
  }));
  async function load(path: string) {
    const b = await readFile(new URL(`../../public${path}`, import.meta.url));
    return (await loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''))
      .scene;
  }
  const pc = new Group();
  pc.add(...Object.values(preparePcModel(await load('/models/creagal/desktop.glb')).groups));
  const monitor = preparePeripheralModel(
    await load(peripherals.monitor.path),
    'x',
    4.1,
    [0, 0, 0],
    peripherals.monitor.exclude,
  );
  const space = new Group();
  for (const pose of [0, 1]) {
    pc.position.set(3.65 + pose, 1.596, -0.5);
    pc.rotation.set(pose * 0.2, pose * 0.7, pose * -0.1);
    pc.scale.setScalar(pose ? 1.13 : 0.68);
    monitor.position.set(-1, 0, -1.3);
    monitor.rotation.set(0, pose * -0.3, 0);
    space.position.set(pose * 2, -pose, pose * 3);
    space.rotation.set(0, pose * 0.4, 0);
    space.scale.setScalar(pose ? 0.8 : 1);
    for (const id of Object.keys(anchors) as SocketId[]) {
      const device = anchors[id].device === 'pc' ? pc : monitor;
      const f = resolveSocketFrame(device, id, space)!;
      assert.ok(f && f.depth > 0 && f.height > 0 && f.width > 0, id);
      const mesh = device.getObjectByName(anchors[id].mesh) as Mesh;
      mesh.geometry.computeBoundingBox();
      for (const landmark of [anchors[id].surface, anchors[id].tip]) {
        assert.ok(
          (mesh.geometry.boundingBox as Box3).distanceToPoint(new Vector3().fromArray(landmark)) <
            0.02,
          `${id}: measured mesh landmark`,
        );
      }
      const pivot = new Matrix4().makeTranslation(0.12, -0.03, 0.07);
      const matrix = plugMatrix(f, pivot);
      const actualTip = new Vector3().setFromMatrixPosition(pivot).applyMatrix4(matrix);
      const expectedWorld = mesh.localToWorld(new Vector3().fromArray(anchors[id].tip));
      assert.ok(
        space.localToWorld(actualTip).distanceTo(expectedWorld) < 1e-9,
        `${id}: physical tip, not origin`,
      );
      const localMatrix = plugMatrix(f, new Matrix4());
      const shoulder = new Vector3(-f.depth, 0, 0).applyMatrix4(localMatrix);
      assert.ok(shoulder.distanceTo(f.surface) < 1e-9, `${id}: no gap at panel`);
      const exit = new Vector3(-f.depth - 0.2, 0, 0).applyMatrix4(localMatrix);
      assert.ok(exit.clone().sub(f.surface).dot(f.inward) < 0, `${id}: cable exits outside device`);
      const approaching = new Vector3().applyMatrix4(plugMatrix(f, new Matrix4(), 0.38));
      assert.ok(Math.abs(approaching.distanceTo(f.tip) - 0.38) < 1e-9);
    }
  }
});
