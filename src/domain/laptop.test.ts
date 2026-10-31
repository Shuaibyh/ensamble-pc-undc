import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyLaptopAssembly,
  installLaptopPart,
  laptopIssues,
  removeLaptopPart,
  checkLaptopAssembly,
} from './laptop';

test('laptop exige la placa base antes de instalar piezas internas', () => {
  const state = emptyLaptopAssembly();
  assert.deepEqual(laptopIssues(state, 'battery'), ['Instala primero placa madre.']);
  const withBoard = installLaptopPart(state, 'motherboard');
  assert.deepEqual(laptopIssues(withBoard, 'battery'), []);
});

test('laptop bloquea retirar una pieza con dependientes', () => {
  const state = installLaptopPart(
    installLaptopPart(emptyLaptopAssembly(), 'motherboard'),
    'battery',
  );
  assert.deepEqual(removeLaptopPart(state, 'motherboard'), state);
  assert.deepEqual(removeLaptopPart(state, 'battery'), { installed: ['base', 'motherboard'] });
});

test('montaje completo, cierre bloqueado y desmontaje inverso', async () => {
  const { laptopParts } = await import('../data/laptop');
  let state = emptyLaptopAssembly();
  assert.ok(laptopIssues(state, 'lowerCover').length);
  for (const part of laptopParts.filter((p) => p.id !== 'base')) {
    assert.deepEqual(laptopIssues(state, part.id), [], part.id);
    state = installLaptopPart(state, part.id);
  }
  assert.deepEqual(checkLaptopAssembly(state), []);
  assert.equal(removeLaptopPart(state, 'motherboard'), state);
  for (const part of laptopParts.filter((p) => p.id !== 'base').reverse()) {
    const next = removeLaptopPart(state, part.id);
    assert.equal(next.installed.length, state.installed.length - 1, part.id);
    state = next;
  }
  assert.deepEqual(state, emptyLaptopAssembly());
});
