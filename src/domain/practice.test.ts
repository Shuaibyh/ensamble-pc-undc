import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyPractice, recordPractice, restorePractice } from './practice';
import { emptyLaptopAssembly, installLaptopPart, laptopIssues } from './laptop';
import { laptopParts } from '../data/laptop';

test('Aprender no penaliza; Practicar registra errores y ayudas sin reiniciar contadores', () => {
  const initial = emptyPractice();
  assert.equal(recordPractice(initial, 'learn', 'error'), initial);
  assert.equal(recordPractice(initial, 'learn', 'hint'), initial);
  const first = recordPractice(initial, 'practice', 'error');
  const helped = recordPractice(first, 'practice', 'hint');
  assert.deepEqual(recordPractice(helped, 'learn', 'error'), { errors: 1, hints: 1 });
});
test('ambos modos mantienen las dependencias de laptop y permiten completar el montaje', () => {
  for (const mode of ['learn', 'practice'] as const) {
    let assembly = emptyLaptopAssembly();
    assert.ok(laptopIssues(assembly, 'screws').length);
    assert.equal(installLaptopPart(assembly, 'screws'), assembly);
    const result = recordPractice(emptyPractice(), mode, 'error');
    assert.equal(result.errors, mode === 'practice' ? 1 : 0);
    for (let pass = 0; pass < laptopParts.length; pass++)
      for (const part of laptopParts) assembly = installLaptopPart(assembly, part.id);
    assert.equal(assembly.installed.length, laptopParts.length);
  }
});
test('los contadores persistidos rechazan datos dañados y valores negativos', () => {
  assert.deepEqual(restorePractice('{'), emptyPractice());
  assert.deepEqual(restorePractice('{"errors":-1,"hints":"3"}'), emptyPractice());
  assert.deepEqual(restorePractice('{"errors":2,"hints":3}'), { errors: 2, hints: 3 });
});
