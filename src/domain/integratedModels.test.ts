import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Mesh, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assemblyModels, casePlacement } from '../data/assemblyModels';
import { prepareAssemblyModel } from '../scene/prepareAssemblyModel';
import { prepareAssemblyCase } from '../scene/prepareAssemblyCase';

async function load(path: string) {
  const bytes = await readFile(new URL(`../../public${path}`, import.meta.url));
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'headless-textures',
    loadTexture: () => Promise.resolve(new Texture()),
  }));
  return (
    await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene;
}

test('las piezas descargadas caben en el volumen interior y no arrastran otros componentes', async () => {
  for (const [id, definition] of Object.entries(assemblyModels)) {
    const source = await load(definition.path);
    const prepared = prepareAssemblyModel(source, definition);
    const local = new Box3().setFromObject(prepared);
    const dimensions = local.getSize(new Vector3());
    assert.ok(local.getCenter(new Vector3()).length() < 0.0001, `${id}: centrado`);
    assert.ok(
      Math.abs(dimensions[definition.referenceAxis] - definition.referenceLength) < 0.0001,
      `${id}: escala`,
    );
    prepared.position.set(...definition.position);
    const bounds = new Box3().setFromObject(prepared);
    assert.ok(bounds.min.x > -2.1 && bounds.max.x < 2.1, `${id}: ancho interior`);
    assert.ok(bounds.min.y > -2.05 && bounds.max.y < 2.15, `${id}: alto interior`);
    assert.ok(bounds.min.z > -0.94 && bounds.max.z < 0.85, `${id}: profundidad interior`);
    if (id === 'board') {
      for (const name of ['CPU', 'M2', 'RAM', 'RAM1', 'RAM2', 'RAM3'])
        assert.equal(prepared.getObjectByName(name), undefined);
    }
    if (id === 'psu') assert.equal(prepared.getObjectByName('Cone_45'), undefined);
  }
});

test('el gabinete abre su lateral sin modificar el GLB original', async () => {
  const source = await load(casePlacement.path);
  const prepared = prepareAssemblyCase(source);
  assert.ok(prepared.panels.length > 1);
  prepared.panels.forEach((panel) => {
    panel.visible = false;
  });
  const glass = source.getObjectByName('glass');
  const inside = source.getObjectByName('inside')?.children[0];
  if (glass && inside instanceof Mesh) {
    assert.equal(glass.visible, true);
    assert.equal(
      prepared.geometries.reduce((count, geometry) => count + geometry.index!.count, 0),
      inside.geometry.index!.count,
      'La cubierta y el interior conservan todos los triangulos originales',
    );
  } else {
    assert.ok(prepared.object.getObjectByName('panel_lateral_didactico'));
    assert.ok(prepared.object.getObjectByName('cubierta_fuente_didactica'));
  }
  for (const material of prepared.materials) {
    assert.ok(
      material.color.r + material.color.g + material.color.b > 0.01,
      'Material visible bajo iluminacion',
    );
  }
  const genericFanNames: string[] = [];
  source.traverse((object) => {
    if (object.name.toLowerCase().includes('fan')) genericFanNames.push(object.name);
  });
  const fanNames = ['spin', 'spin001', 'spin002', 'spin003'].some((name) =>
    source.getObjectByName(name),
  )
    ? ['spin', 'spin001', 'spin002', 'spin003']
    : genericFanNames;
  for (const name of fanNames) {
    const preparedFan = prepared.object.getObjectByName(name);
    if (preparedFan) assert.equal(preparedFan.visible, false, 'Chasis vacio: ' + name);
    assert.ok(source.getObjectByName(name), 'El original conserva sus ventiladores');
  }
  prepared.geometries.forEach((geometry) => geometry.dispose());
  prepared.materials.forEach((material) => material.dispose());
});
