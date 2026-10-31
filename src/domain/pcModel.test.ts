import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Matrix4, Mesh, Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { preparePcModel } from '../scene/preparePcModel';
import { pcModel } from '../data/pcModel';
import targets from '../data/pcTargets.json';
import { emptyAssembly, transition, installIssues } from './assembly';

test('cREAgal conserva cada malla y su matriz mundial, sin duplicar geometría en las piezas', async () => {
  const bytes = await readFile(new URL(`../../public${pcModel.path}`, import.meta.url));
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.register(() => ({
    name: 'test-textures',
    loadTexture: () => Promise.resolve(new Texture()),
  }));
  const { scene } = await loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const { groups, targets: actual, cover } = preparePcModel(scene);
  const normalization = new Matrix4()
    .makeScale(pcModel.scale, pcModel.scale, pcModel.scale)
    .setPosition(...pcModel.offset);
  const originals: Mesh[] = [];
  scene.traverse((o) => {
    if (o instanceof Mesh) originals.push(o);
  });
  const copies = Object.values(groups).flatMap((group) => group.children) as Mesh[];
  assert.equal(copies.length, originals.length);
  assert.equal(new Set(copies.map((m) => m.name)).size, originals.length);
  for (const original of originals) {
    const copy = copies.find((m) => m.name === original.name)!;
    assert.equal(copy.geometry, original.geometry);
    assert.ok(
      copy.matrix.equals(new Matrix4().multiplyMatrices(normalization, original.matrixWorld)),
    );
  }
  for (const [id, target] of Object.entries(targets)) {
    for (const field of ['position', 'size'] as const)
      actual[id][field].forEach((value, axis) =>
        assert.ok(Math.abs(value - target[field][axis]) < 1e-6, `${id}: ${field}`),
      );
  }
  assert.ok(cover.children.length > 0, 'panel de cierre adaptado');
  assert.ok(
    groups.gpu.children.some(
      (m) => m instanceof Mesh && !Array.isArray(m.material) && m.material.name === 'gtx780',
    ),
  );
});

test('la migración conserva CPU → pasta térmica → refrigeración', () => {
  let state = emptyAssembly();
  for (const id of ['standoffs', 'board', 'board-screws', 'cpu'] as const)
    state = transition(state, { type: 'install', id });
  assert.ok(installIssues(state, 'cooler').length);
  state = transition(state, { type: 'install', id: 'paste' });
  assert.deepEqual(installIssues(state, 'cooler'), []);
  assert.ok(transition(state, { type: 'install', id: 'cooler' }).installed.includes('cooler'));
});
