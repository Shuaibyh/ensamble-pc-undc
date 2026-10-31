import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession } from '../domain/session';
import { restoreSession, serializeSession } from './storage';

test('guardado restaura progreso y evaluación con PC apagada y sin bloqueo', () => {
  const session = newSession('practice');
  session.assembly = {
    installed: ['standoffs', 'board', 'board-screws', 'cpu', 'psu'],
    connected: ['eps'],
    powered: true,
  };
  session.busy = 'cpu';
  session.errors = 3;
  session.hints = 2;
  const restored = restoreSession(serializeSession(session));
  assert.deepEqual(restored.assembly.installed, [
    'standoffs',
    'board',
    'board-screws',
    'cpu',
    'psu',
  ]);
  assert.deepEqual(restored.assembly.connected, ['eps']);
  assert.equal(restored.assembly.powered, false);
  assert.equal(restored.busy, null);
  assert.equal(restored.errors, 3);
  assert.equal(restored.hints, 2);
});
test('datos corruptos y versiones desconocidas no rompen la aplicación', () => {
  for (const raw of [null, 'no es JSON', '{}', '{"version":99}', 'null'])
    assert.deepEqual(restoreSession(raw), newSession());
});
test('restauración elimina IDs desconocidos, duplicados y dependencias inválidas', () => {
  const session = newSession();
  const raw = JSON.stringify({
    version: 2,
    session: {
      ...session,
      assembly: {
        installed: ['cpu', 'cpu', 'gpu', 'inventado', 'psu'],
        connected: ['atx', 'pcie'],
      },
      errors: -4,
      log: [1, 'Evento válido'],
    },
  });
  const restored = restoreSession(raw);
  assert.deepEqual(restored.assembly.installed, ['psu']);
  assert.deepEqual(restored.assembly.connected, []);
  assert.equal(restored.errors, 0);
  assert.deepEqual(restored.log, ['Evento válido']);
});
