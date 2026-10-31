import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePath, resolveNavigation, sectionPath, viewPaths } from '../navigation';

test('resuelve las rutas públicas de cada módulo', () => {
  assert.equal(resolveNavigation({ pathname: viewPaths.assembly }).view, 'assembly');
  assert.equal(resolveNavigation({ pathname: viewPaths.laptop }).view, 'laptop');
  assert.equal(resolveNavigation({ pathname: viewPaths.setup }).view, 'setup');
  assert.equal(resolveNavigation({ pathname: viewPaths.library }).view, 'library');
});
test('mantiene compatibilidad con enlaces antiguos', () => {
  assert.equal(resolveNavigation({ pathname: '/', search: '?view=laptop' }).view, 'laptop');
});
test('redirige al inicio los accesos del módulo ARGB eliminado', () => {
  assert.equal(resolveNavigation({ pathname: '/ventiladores-argb-beta' }).view, 'home');
  assert.equal(resolveNavigation({ pathname: '/fans' }).view, 'home');
  assert.equal(resolveNavigation({ pathname: '/', search: '?view=fans' }).view, 'home');
});
test('resuelve apartados y normaliza el slash final', () => {
  assert.deepEqual(resolveNavigation({ pathname: '/proyecto/' }), {
    view: 'home',
    section: 'proyecto',
  });
  assert.equal(normalizePath('/ensamblar-pc/'), '/ensamblar-pc');
  assert.equal(sectionPath('creditos'), '/creditos');
});
