import test from 'node:test';
import assert from 'node:assert/strict';
import { parts } from '../data/catalog';
import { specificationIssues } from './specifications';

test('los recursos sin especificaciones verificadas no afirman compatibilidad', () => {
  for (const part of parts) assert.deepEqual(specificationIssues(part, parts), []);
});
test('se detecta socket, anclaje y generación RAM distintos', () => {
  for (const id of ['cpu', 'cooler', 'ram']) {
    const original = parts.find((part) => part.id === id)!;
    const changed = {
      ...original,
      specifications: { ...original.specifications, socket: 'OTRO', memory: 'DDR4' },
    };
    const referenceParts = parts.map((part) => ({
      ...part,
      specifications: { ...part.specifications, socket: 'AM5', memory: 'DDR5' },
    }));
    assert.equal(specificationIssues(changed, referenceParts).length, 1);
  }
});
