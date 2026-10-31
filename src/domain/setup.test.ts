import test from 'node:test';
import assert from 'node:assert/strict';
import {
  setupCables,
  setupIssues,
  setupConnectionIssue,
  toggleSetupCable,
  type SetupCableId,
} from './setup';
import { readFile } from 'node:fs/promises';
import { Box3, Texture, Vector3, CatmullRomCurve3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { peripherals } from '../data/peripherals';
import { preparePeripheralModel } from '../scene/preparePeripheralModel';
import { setupRoutes, pcPosition, pcScale, pcRearX } from '../data/setupLayout';
import { connectionEndpoint } from './connectionMotion';

test('permite reconectar todos los cables y bloquea cambios durante encendido o animación', () => {
  assert.equal(setupConnectionIssue(true, false, false), null);
  assert.ok(setupConnectionIssue(false, false, false));
  assert.ok(setupConnectionIssue(true, true, false));
  assert.ok(setupConnectionIssue(true, false, true));
  const all = setupCables.map(({ id }) => id);
  for (const id of all) {
    const disconnected = toggleSetupCable(all, id);
    assert.equal(disconnected.length, all.length - 1);
    assert.equal(setupIssues(true, disconnected).length, 1);
    const reconnected = toggleSetupCable(disconnected, id);
    assert.equal(new Set(reconnected).size, all.length);
    assert.deepEqual(setupIssues(true, reconnected), []);
  }
});

test('la clavija se aproxima al puerto y termina exactamente insertada', () => {
  const target: [number, number, number] = [2, 1, -1];
  assert.deepEqual(connectionEndpoint(target, 1, [-1, 0, 0]), target);
  assert.ok(connectionEndpoint(target, 0, [-1, 0, 0])[0] < target[0]);
  assert.ok(connectionEndpoint(target, 0.5, [-1, 0, 0])[0] < target[0]);
});

test('la estación final exige montaje interno y cinco conexiones sin duplicados', () => {
  assert.equal(setupIssues(false, []).length, 6);
  let connected: SetupCableId[] = [];
  for (const cable of setupCables) connected = toggleSetupCable(connected, cable.id);
  assert.deepEqual(setupIssues(true, connected), []);
  for (const cable of setupCables) {
    assert.equal(
      setupIssues(
        true,
        connected.filter((id) => id !== cable.id),
      ).length,
      1,
    );
  }
  connected = toggleSetupCable(connected, 'video');
  assert.deepEqual(setupIssues(true, connected), ['Falta conectar: DisplayPort: GPU → monitor.']);
});

for (const peripheral of Object.values(peripherals)) {
  test(`periférico disponible y escalado: ${peripheral.name}`, async () => {
    const bytes = await readFile(new URL(`../../public${peripheral.path}`, import.meta.url));
    const loader = new GLTFLoader();
    loader.register(() => ({
      name: 'headless-textures',
      loadTexture: () => Promise.resolve(new Texture()),
    }));
    const gltf = await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    );
    const object = preparePeripheralModel(
      gltf.scene,
      peripheral.axis,
      peripheral.length,
      peripheral.rotation,
      peripheral.exclude,
    );
    const bounds = new Box3().setFromObject(object);
    assert.ok(
      Math.abs(bounds.getSize(new Vector3())[peripheral.axis] - peripheral.length) < 0.0001,
    );
    assert.ok(Math.abs(bounds.min.y) < 0.0001, 'El cuerpo debe apoyarse sobre la mesa');
    const size = bounds.getSize(new Vector3());
    assert.ok(Math.abs(bounds.getCenter(new Vector3()).x) < 0.0001);
    assert.ok(Math.abs(bounds.getCenter(new Vector3()).z) < 0.0001);
    if (peripheral.path.includes('keyboard')) {
      assert.ok(size.x > 3.3 && size.z < 1.1, 'El cable original no debe reducir el teclado');
      assert.equal(object.getObjectByName('wire'), undefined);
      assert.ok(gltf.scene.getObjectByName('wire'), 'Conservar el archivo original');
    }
    if (peripheral.path.includes('mouse')) {
      assert.ok(size.z > size.x * 1.7 && size.x < 0.55, 'Mouse orientado hacia el monitor');
    }
    if (peripheral.path.includes('keyboard') || peripheral.path.includes('mouse')) {
      object.position.set(...peripheral.position);
      const worldBounds = new Box3().setFromObject(object);
      const id = peripheral.path.includes('keyboard') ? 'keyboard-usb' : 'mouse-usb';
      assert.ok(
        worldBounds.distanceToPoint(new Vector3(...setupRoutes[id][0])) < 0.02,
        'El cable empieza en el cuerpo del periférico',
      );
    }
  });
}

test('free-span cable waypoints clear the desk and the chassis', () => {
  for (const [id, points] of Object.entries(setupRoutes)) {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    for (const point of curve.getPoints(500)) {
      assert.ok(point.y > 0.015, `${id} crosses the desk at ${point.toArray()}`);
      assert.ok(point.x < pcRearX, `${id} cable crosses the PC rear plane`);
    }
  }
  assert.ok(pcPosition[1] > 0 && pcScale > 0);
});
