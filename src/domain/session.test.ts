import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, sessionReducer } from './session';
import { parts, cables } from '../data/catalog';

test('la animación bloquea instalar, retirar, reiniciar y cambiar de modo', () => {
  const busy = sessionReducer(newSession(), {
    type: 'command',
    action: { type: 'install', id: 'standoffs' },
  });
  assert.equal(busy.busy, 'standoffs');
  for (const action of [
    { type: 'install', id: 'cpu' },
    { type: 'remove', id: 'standoffs' },
    { type: 'reset' },
  ] as const) {
    assert.deepEqual(sessionReducer(busy, { type: 'command', action }).assembly, busy.assembly);
  }
  assert.equal(sessionReducer(busy, { type: 'mode', mode: 'practice' }).mode, 'learn');
  assert.equal(sessionReducer(busy, { type: 'finish', id: 'cpu' }).busy, 'standoffs');
  assert.equal(sessionReducer(busy, { type: 'finish', id: 'standoffs' }).busy, null);
});
test('práctica registra errores por intento, ayudas y cambios sin borrar el historial', () => {
  let session = newSession('practice');
  session = sessionReducer(session, { type: 'command', action: { type: 'power' } });
  assert.equal(session.errors, 1);
  assert.equal(session.messages.length, parts.length + cables.length);
  session = sessionReducer(session, { type: 'hint', name: 'Procesador' });
  assert.equal(session.hints, 1);
  session = sessionReducer(session, { type: 'mode', mode: 'learn' });
  assert.equal(session.modeChanges, 1);
  assert.equal(session.errors, 1);
  session = sessionReducer(session, {
    type: 'command',
    action: { type: 'install', id: 'standoffs' },
  });
  assert.equal(session.guidedInstalls, 1);
});
test('ambos modos completan el mismo montaje y comprobar no enciende', () => {
  for (const mode of ['learn', 'practice'] as const) {
    let session = newSession(mode);
    for (const part of parts) {
      session = sessionReducer(session, {
        type: 'command',
        action: { type: 'install', id: part.id },
      });
      session = sessionReducer(session, { type: 'finish', id: part.id });
    }
    for (const cable of cables)
      session = sessionReducer(session, {
        type: 'command',
        action: { type: 'connect', id: cable.id },
      });
    session = sessionReducer(session, { type: 'check' });
    assert.equal(session.assembly.powered, false);
    session = sessionReducer(session, { type: 'command', action: { type: 'power' } });
    assert.equal(session.assembly.powered, true);
    session = sessionReducer(session, { type: 'command', action: { type: 'reset' } });
    assert.deepEqual(session, newSession(mode));
  }
});
test('duplicados se rechazan sin cambiar el montaje y el historial tiene límite', () => {
  let session = newSession('practice');
  session = sessionReducer(session, {
    type: 'command',
    action: { type: 'install', id: 'standoffs' },
  });
  session = sessionReducer(session, { type: 'finish', id: 'standoffs' });
  for (let i = 0; i < 40; i++)
    session = sessionReducer(session, {
      type: 'command',
      action: { type: 'install', id: 'standoffs' },
    });
  assert.equal(session.assembly.installed.length, 1);
  assert.equal(session.errors, 40);
  assert.equal(session.log.length, 30);
});
