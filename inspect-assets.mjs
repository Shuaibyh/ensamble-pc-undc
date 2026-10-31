import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Texture, Vector3 } from 'three';
const paths = [
  'cases/corsair-4000d',
  'cases/nightshark',
  'motherboards/motherboard',
  'power-supplies/psu',
  'gpus/gpu',
  'ram/ram',
  'storage/storage',
  'cooling/cooler',
];
const result = {};
for (const path of paths) {
  const bytes = await readFile(`public/models/${path}.glb`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'inspect', loadTexture: () => Promise.resolve(new Texture()) }));
  const { scene } = await loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  scene.updateMatrixWorld(true);
  const entries = [];
  scene.traverse((o) => {
    const depth = (node) => (node.parent ? depth(node.parent) + 1 : 0);
    if (depth(o) > 5 && path !== 'cases/nightshark') return;
    const b = new Box3().setFromObject(o);
    entries.push({
      name: o.name,
      mesh: !!o.isMesh,
      material: o.material?.name,
      depth: depth(o),
      min: b.min.toArray(),
      max: b.max.toArray(),
      size: b.getSize(new Vector3()).toArray(),
    });
  });
  result[path] = entries;
}
await writeFile('../docs/asset-inspection/placement-bounds.json', JSON.stringify(result, null, 2));
