import test from 'node:test';
import assert from 'node:assert/strict';
import { parts, cables } from '../data/catalog';
import { newSession, sessionReducer, type Mode } from './session';
import { setupCables } from './setup';
import { restoreSession, serializeSession } from '../state/storage';

function assemble(mode: Mode) {
  let session = newSession(mode);
  for (const { id } of parts) {
    session = sessionReducer(session, { type: 'command', action: { type: 'install', id } });
    session = sessionReducer(session, { type: 'finish', id });
  }
  for (const { id } of cables)
    session = sessionReducer(session, { type: 'command', action: { type: 'connect', id } });
  return session;
}

for (const mode of ['learn', 'practice'] as const) {
  test(`${mode}: montaje → cierre → estación → arranque, recarga y reinicio`, () => {
    let session = assemble(mode);
    assert.equal(sessionReducer(session, { type: 'setup-power' }).assembly.powered, false);
    assert.deepEqual(
      sessionReducer(session, { type: 'setup-cable', id: 'video' }).setupConnected,
      [],
    );
    session = sessionReducer(session, { type: 'case', closed: true });
    session = restoreSession(serializeSession(session));
    assert.equal(session.caseClosed, true);
    assert.equal(session.mode, mode);
    for (const { id } of setupCables)
      session = sessionReducer(session, { type: 'setup-cable', id });
    session = restoreSession(serializeSession(session));
    assert.equal(session.setupConnected.length, setupCables.length);
    assert.equal(session.experienceCompleted, false);
    session = sessionReducer(session, { type: 'setup-power' });
    assert.equal(session.assembly.powered, true);
    assert.equal(sessionReducer(session, { type: 'case', closed: false }).caseClosed, true);
    assert.deepEqual(
      sessionReducer(session, { type: 'setup-clear' }).setupConnected,
      session.setupConnected,
    );
    session = sessionReducer(session, { type: 'boot-complete' });
    assert.equal(session.experienceCompleted, true);
    session = restoreSession(serializeSession(session));
    assert.equal(session.experienceCompleted, true);
    assert.equal(session.assembly.powered, false);
    session = sessionReducer(session, { type: 'command', action: { type: 'reset' } });
    assert.deepEqual(
      restoreSession(serializeSession(session), JSON.stringify(['video'])),
      newSession(mode),
    );
  });
}

test('práctica registra comprobaciones incompletas y conserva modo y contadores', () => {
  let session = assemble('practice');
  session = sessionReducer(session, { type: 'setup-power' });
  assert.equal(session.errors, 1);
  session = sessionReducer(session, { type: 'mode', mode: 'learn' });
  session = restoreSession(serializeSession(session));
  assert.equal(session.errors, 1);
  assert.equal(session.modeChanges, 1);
  assert.equal(session.mode, 'learn');
});

test('editar el interior invalida cierre y finalización, conserva conexiones externas', () => {
  let session = {
    ...assemble('learn'),
    caseClosed: true,
    setupConnected: setupCables.map((c) => c.id),
    experienceCompleted: true,
  };
  session = sessionReducer(session, {
    type: 'command',
    action: { type: 'disconnect', id: cables[0].id },
  });
  assert.equal(session.caseClosed, false);
  assert.equal(session.experienceCompleted, false);
  assert.equal(session.setupConnected.length, setupCables.length);
  assert.equal(sessionReducer(session, { type: 'boot-complete' }).experienceCompleted, false);
});

test('migra estación antigua y descarta duplicados y finalizaciones inválidas', () => {
  const session = assemble('practice');
  const migrated = restoreSession(
    JSON.stringify({ version: 3, session }),
    '["video","video","unknown"]',
  );
  assert.deepEqual(migrated.setupConnected, ['video']);
  assert.equal(migrated.caseClosed, false);
  assert.equal(migrated.mode, 'practice');
  const invalid = restoreSession(
    JSON.stringify({
      version: 4,
      session: {
        ...newSession(),
        caseClosed: true,
        experienceCompleted: true,
        setupConnected: ['video', 'video', 'unknown'],
      },
    }),
  );
  assert.equal(invalid.caseClosed, false);
  assert.equal(invalid.experienceCompleted, false);
  assert.deepEqual(invalid.setupConnected, ['video']);
});
