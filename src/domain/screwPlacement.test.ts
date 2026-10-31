import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyScrews, screwTransition } from './screwPlacement';
import { allFastenersPlaced } from './manualPlacement';
import { newSession, sessionReducer } from './session';
import {
  emptyLaptopAssembly,
  installLaptopPart,
  laptopIssues,
  checkLaptopAssembly,
  removeLaptopPart,
} from './laptop';
import { parts, cables } from '../data/catalog';
import { laptopParts } from '../data/laptop';

for (const [name, count] of [
  ['placa PC', 9],
  ['cierre PC', 4],
  ['laptop', 18],
] as const) {
  test(`${name}: selección + Insertar, conteo al terminar animación y rechazo de duplicados`, () => {
    let state = emptyScrews();
    assert.equal(screwTransition(state, { type: 'insert' }, count, true), state);
    for (let index = 0; index < count; index++) {
      state = screwTransition(state, { type: 'select', index }, count, true);
      assert.equal(state.selected, index);
      assert.equal(state.installed.length, index, 'seleccionar no instala');
      state = screwTransition(state, { type: 'insert' }, count, true);
      assert.equal(state.installed.length, index, 'Insertar espera a la animación');
      assert.equal(screwTransition(state, { type: 'insert' }, count, true), state, 'doble clic');
      assert.equal(
        screwTransition(state, { type: 'select', index: (index + 1) % count }, count, true),
        state,
        'animación bloquea selección',
      );
      assert.equal(
        screwTransition(state, { type: 'finish', index: count + 1 }, count, true),
        state,
      );
      state = screwTransition(state, { type: 'finish', index }, count, true);
      assert.equal(state.installed.length, index + 1);
      assert.equal(screwTransition(state, { type: 'finish', index }, count, true), state);
      assert.equal(screwTransition(state, { type: 'select', index }, count, true), state);
      assert.equal(allFastenersPlaced(count, state.installed), index === count - 1);
    }
    assert.deepEqual(screwTransition(state, { type: 'reset' }, count, true), emptyScrews());
  });
}

test('no acepta fijaciones sin componente, índices inválidos ni finales de una animación cancelada', () => {
  const initial = emptyScrews();
  assert.equal(screwTransition(initial, { type: 'select', index: 0 }, 4, false), initial);
  for (const index of [-1, 4, NaN, 1.2])
    assert.equal(screwTransition(initial, { type: 'select', index }, 4, true), initial);
  const selected = screwTransition(initial, { type: 'select', index: 0 }, 4, true);
  assert.equal(screwTransition(selected, { type: 'insert' }, 4, false), selected);
  const inserting = screwTransition(selected, { type: 'insert' }, 4, true);
  const reset = screwTransition(inserting, { type: 'reset' }, 4, false);
  assert.deepEqual(reset, initial);
  assert.equal(screwTransition(reset, { type: 'finish', index: 0 }, 4, true), reset);
});

test('la estación PC queda bloqueada durante todas las fijaciones pendientes del panel', () => {
  let session = newSession();
  for (const { id } of parts) {
    session = sessionReducer(session, { type: 'command', action: { type: 'install', id } });
    session = sessionReducer(session, { type: 'finish', id });
  }
  for (const { id } of cables)
    session = sessionReducer(session, { type: 'command', action: { type: 'connect', id } });
  let screws = emptyScrews();
  for (let index = 0; index < 4; index++) {
    assert.equal(session.caseClosed, false);
    assert.deepEqual(
      sessionReducer(session, { type: 'setup-cable', id: 'video' }).setupConnected,
      [],
    );
    assert.equal(sessionReducer(session, { type: 'setup-power' }).assembly.powered, false);
    screws = screwTransition(screws, { type: 'select', index }, 4, true);
    screws = screwTransition(screws, { type: 'insert' }, 4, true);
    screws = screwTransition(screws, { type: 'finish', index }, 4, true);
    if (allFastenersPlaced(4, screws.installed))
      session = sessionReducer(session, { type: 'case', closed: true });
  }
  assert.equal(session.caseClosed, true);
  assert.deepEqual(sessionReducer(session, { type: 'setup-cable', id: 'video' }).setupConnected, [
    'video',
  ]);
  session = sessionReducer(session, { type: 'case', closed: false });
  screws = screwTransition(screws, { type: 'reset' }, 4, true);
  assert.equal(session.caseClosed, false);
  assert.equal(allFastenersPlaced(4, screws.installed), false);
});

test('la laptop exige carcasa y todas las fijaciones; retirarlas permite reinstalarlas sin duplicar', () => {
  let assembly = emptyLaptopAssembly();
  assert.ok(laptopIssues(assembly, 'screws').length);
  for (const part of laptopParts.filter((p) => p.id !== 'base' && p.id !== 'screws'))
    assembly = installLaptopPart(assembly, part.id);
  let screws = emptyScrews();
  for (let index = 0; index < 18; index++) {
    assert.ok(checkLaptopAssembly(assembly).length);
    const ready = laptopIssues(assembly, 'screws').length === 0;
    screws = screwTransition(screws, { type: 'select', index }, 18, ready);
    screws = screwTransition(screws, { type: 'insert' }, 18, ready);
    screws = screwTransition(screws, { type: 'finish', index }, 18, ready);
    if (allFastenersPlaced(18, screws.installed)) assembly = installLaptopPart(assembly, 'screws');
  }
  assert.deepEqual(checkLaptopAssembly(assembly), []);
  assert.equal(installLaptopPart(assembly, 'screws'), assembly);
  assembly = removeLaptopPart(assembly, 'screws');
  screws = screwTransition(screws, { type: 'reset' }, 18, true);
  assert.ok(checkLaptopAssembly(assembly).length);
  assert.deepEqual(screws, emptyScrews());
  assert.deepEqual(laptopIssues(assembly, 'screws'), []);
});
