import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  BoxGeometry,
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
  TubeGeometry,
  Vector3,
} from 'three';
import { peripherals } from './src/data/peripherals';
import { pcPosition, pcScale, setupRoutes } from './src/data/setupLayout';
import { preparePeripheralModel } from './src/scene/preparePeripheralModel';
import { assemblyModels, casePlacement } from './src/data/assemblyModels';
import { prepareDetailedPart } from './src/scene/prepareDetailedPart';
import { prepareAssemblyCase } from './src/scene/prepareAssemblyCase';

async function load(path: string) {
  const bytes = await readFile(`public${path}`);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'preview', loadTexture: () => Promise.resolve(new Texture()) }));
  return (
    await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene;
}
const root = new Group();
const chassis = prepareAssemblyCase(await load(casePlacement.path));
chassis.panels.forEach((panel) => {
  panel.visible = false;
});
root.add(chassis.object);
for (const definition of Object.values(assemblyModels)) {
  const id = Object.entries(assemblyModels).find(
    ([, item]) => item === definition,
  )![0] as keyof typeof assemblyModels;
  const part = prepareDetailedPart(await load(definition.path), id);
  part.position.set(...definition.position);
  root.add(part);
}
root.updateMatrixWorld(true);
const setup = process.argv.includes('--setup');
const scene = new Group();
scene.add(root);
if (setup) {
  root.scale.setScalar(pcScale);
  root.position.set(...pcPosition);
  for (const definition of Object.values(peripherals)) {
    const object = preparePeripheralModel(
      await load(definition.path),
      definition.axis,
      definition.length,
      definition.rotation,
      definition.exclude,
    );
    object.position.set(...definition.position);
    scene.add(object);
  }
  const table = new Mesh(
    new BoxGeometry(10, 0.16, 5.6),
    new MeshStandardMaterial({ color: '#596879' }),
  );
  table.position.set(0.5, -0.08, 0.2);
  scene.add(table);
  for (const route of Object.values(setupRoutes)) {
    scene.add(
      new Mesh(
        new TubeGeometry(
          new CatmullRomCurve3(route.map((p) => new Vector3(...p))),
          96,
          0.016,
          6,
          false,
        ),
        new MeshStandardMaterial({ color: '#25313f' }),
      ),
    );
  }
}
scene.updateMatrixWorld(true);
const rows: number[] = [];
const vertex = new Vector3();
scene.traverseVisible((object) => {
  if (!(object instanceof Mesh)) return;
  const material = object.material as MeshStandardMaterial;
  const position = object.geometry.getAttribute('position');
  const index = object.geometry.index;
  const count = index?.count ?? position.count;
  for (let i = 0; i < count; i += 3) {
    for (let k = 0; k < 3; k++) {
      vertex
        .fromBufferAttribute(position, index ? index.getX(i + k) : i + k)
        .applyMatrix4(object.matrixWorld);
      rows.push(...vertex.toArray());
    }
    rows.push(...material.color.toArray());
  }
});
await writeFile(
  `../docs/asset-inspection/${setup ? 'setup' : 'assembly'}-preview.bin`,
  Buffer.from(new Float32Array(rows).buffer),
);
console.log(`${rows.length / 12} triángulos exportados para diagnóstico sin texturas.`);
