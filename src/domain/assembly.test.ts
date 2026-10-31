import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parts,
  cables,
  emptyAssembly,
  transition,
  powerIssues,
  removeIssues,
  type Assembly,
} from './assembly';
function complete() {
  let s = emptyAssembly();
  for (const p of parts) s = transition(s, { type: 'install', id: p.id });
  for (const c of cables) s = transition(s, { type: 'connect', id: c.id });
  return s;
}
test('el equipo vacío no enciende y enumera todos los pendientes', () => {
  const s = emptyAssembly();
  assert.equal(powerIssues(s).length, parts.length + cables.length);
  assert.equal(transition(s, { type: 'power' }).powered, false);
});
test('cada dependencia de instalación se exige', () => {
  for (const p of parts) {
    for (const dep of p.depends) {
      const s: Assembly = {
        installed: p.depends.filter((d) => d !== dep),
        connected: [],
        powered: false,
      };
      assert.deepEqual(transition(s, { type: 'install', id: p.id }), s);
    }
  }
});
test('cada conexión exige todos sus componentes', () => {
  for (const c of cables) {
    for (const dep of c.depends) {
      const s: Assembly = {
        installed: c.depends.filter((d) => d !== dep),
        connected: [],
        powered: false,
      };
      assert.deepEqual(transition(s, { type: 'connect', id: c.id }), s);
    }
  }
});
test('montaje completo enciende y bloquea cambios hasta apagar', () => {
  const s = complete();
  assert.equal(s.installed.length, parts.length);
  assert.equal(s.connected.length, cables.length);
  assert.deepEqual(powerIssues(s), []);
  const on = transition(s, { type: 'power' });
  assert.equal(on.powered, true);
  assert.deepEqual(transition(on, { type: 'remove', id: 'cooler' }), on);
  assert.deepEqual(transition(on, { type: 'disconnect', id: 'atx' }), on);
  assert.equal(transition(on, { type: 'off' }).powered, false);
});
test('cada pieza y cada cable faltante impide encender', () => {
  const s = complete();
  for (const p of parts)
    assert.equal(
      transition({ ...s, installed: s.installed.filter((id) => id !== p.id) }, { type: 'power' })
        .powered,
      false,
    );
  for (const c of cables)
    assert.equal(
      transition({ ...s, connected: s.connected.filter((id) => id !== c.id) }, { type: 'power' })
        .powered,
      false,
    );
});
test('retirada protege dependencias y permite desmontaje completo', () => {
  let s = complete();
  assert.ok(removeIssues(s, 'board').length);
  assert.ok(removeIssues(s, 'psu').length);
  assert.deepEqual(transition(s, { type: 'remove', id: 'cpu' }), s);
  for (const c of cables) s = transition(s, { type: 'disconnect', id: c.id });
  for (const part of [...parts].reverse()) s = transition(s, { type: 'remove', id: part.id });
  assert.deepEqual(s, emptyAssembly());
});
test('instalar y conectar dos veces no duplica; reiniciar borra todo', () => {
  const s = complete();
  assert.deepEqual(transition(s, { type: 'install', id: 'cpu' }), s);
  assert.deepEqual(transition(s, { type: 'connect', id: 'atx' }), s);
  assert.deepEqual(transition({ ...s, powered: true }, { type: 'reset' }), emptyAssembly());
});
