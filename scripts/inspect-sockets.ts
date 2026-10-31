import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Box3, Mesh, Texture, Vector3 } from 'three';
import { preparePcModel } from '../src/scene/preparePcModel';
import { preparePeripheralModel } from '../src/scene/preparePeripheralModel';
import { peripherals } from '../src/data/peripherals';

for (const path of ['creagal/desktop', 'peripherals/monitor']) {
  const bytes = await readFile(`public/models/${path}.glb`);
  const folder = '../docs/qa-sockets';
  await mkdir(folder, { recursive: true });
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const bin = bytes.subarray(28 + bytes.readUInt32LE(12));
  for (const i of path.includes('desktop') ? [2] : json.images.map((_: unknown, i: number) => i)) {
    const img = json.images[i];
    const view = json.bufferViews[img.bufferView];
    await writeFile(
      `${folder}/${path.includes('desktop') ? 'pc' : 'monitor'}-${i}.${img.mimeType === 'image/png' ? 'png' : 'jpg'}`,
      bin.subarray(view.byteOffset, view.byteOffset + view.byteLength),
    );
  }
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.register(() => ({ name: 'inspect', loadTexture: () => Promise.resolve(new Texture()) }));
  const { scene } = await loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const groups = path.includes('desktop')
    ? preparePcModel(scene).groups
    : { monitor: preparePeripheralModel(scene, 'x', 4.1, [0, 0, 0], peripherals.monitor.exclude) };
  const exported: unknown[] = [];
  for (const [id, group] of Object.entries(groups)) {
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      if (
        [
          'Object_5',
          'Object_7',
          'Object_26',
          'Object_28',
          'Object_34',
          'Object_94',
          'Object_96',
          'Cube_Case_0',
          'Cube_USB_0',
        ].includes(o.name)
      ) {
        const p = o.geometry.attributes.position;
        exported.push({
          name: o.name,
          positions: Array.from({ length: p.count }, (_, i) =>
            new Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).toArray(),
          ),
          uv: Array.from(o.geometry.attributes.uv?.array ?? []),
          indices: Array.from(o.geometry.index?.array ?? []),
        });
      }
      const b = new Box3().setFromObject(o);
      if (
        path.includes('desktop') &&
        (b.min.x > -2.2 || !['chassis', 'gpu', 'psu', 'board'].includes(id))
      )
        return;
      console.log(
        JSON.stringify({
          id,
          name: o.name,
          min: b.min.toArray(),
          max: b.max.toArray(),
          material: Array.isArray(o.material) ? o.material.map((m) => m.name) : o.material.name,
          matrix: o.matrixWorld.elements,
        }),
      );
      if (
        !['Object_94', 'Object_96', 'Object_5', 'Object_26', 'Object_28', 'Cube_USB_0'].includes(
          o.name,
        )
      )
        return;
      const pos = o.geometry.attributes.position;
      const indices = o.geometry.index?.array ?? Array.from({ length: pos.count }, (_, i) => i);
      const vertices = Array.from({ length: pos.count }, (_, i) =>
        new Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld),
      );
      const keys = vertices.map((v) =>
        v
          .toArray()
          .map((n) => n.toFixed(5))
          .join(','),
      );
      const parent = new Map(keys.map((k) => [k, k]));
      const root = (k: string): string => (parent.get(k) === k ? k : root(parent.get(k)!));
      for (let i = 0; i < indices.length; i += 3)
        for (let j = 1; j < 3; j++) parent.set(root(keys[indices[i + j]]), root(keys[indices[i]]));
      const islands = new Map<string, Box3>();
      vertices.forEach((v, i) => {
        const k = root(keys[i]);
        if (!islands.has(k)) islands.set(k, new Box3());
        islands.get(k)!.expandByPoint(v);
      });
      console.log(
        'ISLANDS',
        o.name,
        JSON.stringify(
          [...islands.values()].map((b) => ({ min: b.min.toArray(), max: b.max.toArray() })),
        ),
      );
    });
  }
  await writeFile(
    `${folder}/${path.includes('desktop') ? 'pc' : 'monitor'}-geometry.json`,
    JSON.stringify(exported),
  );
}
