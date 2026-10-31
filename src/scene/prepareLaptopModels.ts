import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import type { LaptopPartId } from '../domain/laptop';

export interface PreparedLaptopPiece {
  object: Group;
  center: [number, number, number];
  size: [number, number, number];
}

// Bake world transforms into copied geometry. Originals and shared loader cache stay intact.
function bakedMeshes(source: Object3D): Mesh[] {
  source.updateMatrixWorld(true);
  const meshes: Mesh[] = [];
  source.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    geometry.applyMatrix4(node.matrixWorld);
    const mesh = new Mesh(geometry, node.material);
    mesh.name = node.name;
    meshes.push(mesh);
  });
  return meshes;
}

function subset(mesh: Mesh, accept: (center: Vector3) => boolean): Mesh | null {
  const position = mesh.geometry.getAttribute('position');
  const selected: number[] = [];
  const center = new Vector3();
  const vertex = new Vector3();
  for (let i = 0; i < position.count; i += 3) {
    center.set(0, 0, 0);
    for (let j = 0; j < 3; j++) center.add(vertex.fromBufferAttribute(position, i + j));
    center.multiplyScalar(1 / 3);
    if (accept(center)) selected.push(i, i + 1, i + 2);
  }
  if (!selected.length) return null;
  const geometry = new BufferGeometry();
  for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
    const values = new Float32Array(selected.length * attribute.itemSize);
    selected.forEach((index, n) => {
      for (let axis = 0; axis < attribute.itemSize; axis++)
        values[n * attribute.itemSize + axis] = attribute.getComponent(index, axis);
    });
    geometry.setAttribute(name, new BufferAttribute(values, attribute.itemSize));
  }
  const result = new Mesh(geometry, mesh.material);
  result.name = mesh.name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function centered(object: Group): PreparedLaptopPiece {
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) throw new Error('El recurso no contiene la pieza solicitada.');
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  object.position.sub(center);
  const wrapper = new Group();
  wrapper.add(object);
  return { object: wrapper, center: center.toArray(), size: size.toArray() };
}

// Best-fit plane: remove the scan's tilt with a rigid rotation, never squash its thickness.
function planeNormal(meshes: Mesh[]): Vector3 {
  const samples: Vector3[] = [];
  const mean = new Vector3();
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += Math.max(1, Math.floor(positions.count / 2500))) {
      const p = new Vector3().fromBufferAttribute(positions, i);
      samples.push(p);
      mean.add(p);
    }
  }
  mean.divideScalar(samples.length);
  const a = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const point of samples) {
    const p = point.sub(mean).toArray();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a[i][j] += p[i] * p[j];
  }
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let step = 0; step < 30; step++) {
    let p = 0,
      q = 1;
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        if (Math.abs(a[i][j]) > Math.abs(a[p][q])) {
          p = i;
          q = j;
        }
    if (Math.abs(a[p][q]) < 1e-8) break;
    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(angle),
      s = Math.sin(angle);
    for (let i = 0; i < 3; i++) {
      const x = a[i][p],
        y = a[i][q];
      a[i][p] = c * x - s * y;
      a[i][q] = s * x + c * y;
    }
    for (let i = 0; i < 3; i++) {
      const x = a[p][i],
        y = a[q][i];
      a[p][i] = c * x - s * y;
      a[q][i] = s * x + c * y;
      const vx = v[i][p],
        vy = v[i][q];
      v[i][p] = c * vx - s * vy;
      v[i][q] = s * vx + c * vy;
    }
  }
  const index = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j])[0];
  const normal = new Vector3(v[0][index], v[1][index], v[2][index]).normalize();
  if (normal.y < 0) normal.negate();
  return normal;
}

export function prepareLaptopInterior(
  source: Object3D,
): Partial<Record<LaptopPartId, PreparedLaptopPiece>> {
  const copy = source.clone(true);
  // This donor embeds a presentation transform on the first node.
  copy.children[0].position.set(0, 0, 0);
  copy.children[0].rotation.set(0, Math.PI, 0);
  copy.children[0].scale.set(1, 1, 1);
  copy.children[0].updateMatrix();
  const meshes = bakedMeshes(copy);
  const rotation = new Matrix4().makeRotationFromQuaternion(
    new Quaternion().setFromUnitVectors(planeNormal(meshes), new Vector3(0, 1, 0)),
  );
  const group = new Group();
  rotation.premultiply(new Matrix4().makeRotationY(-0.065));
  for (const mesh of meshes) {
    mesh.geometry.applyMatrix4(rotation);
    group.add(mesh);
  }
  const bounds = new Box3().setFromObject(group);
  const size = bounds.getSize(new Vector3());
  const middle = bounds.getCenter(new Vector3());
  const factor = Math.min(7 / size.x, 4.7 / size.z);
  const matrix = new Matrix4().makeScale(factor, factor, factor);
  matrix.setPosition(-middle.x * factor, -bounds.min.y * factor + 0.44, -middle.z * factor);
  for (const mesh of meshes) mesh.geometry.applyMatrix4(matrix);
  const width = size.x * factor,
    depth = size.z * factor;
  // Non-overlapping regions preserve the photographed assembly's original spatial relationships.
  function region(p: Vector3): LaptopPartId {
    const x = p.x / width,
      z = p.z / depth;
    if (Math.abs(x) > 0.47 || Math.abs(z) > 0.47) return 'base';
    if (z > 0.12 && Math.abs(x) < 0.4 && z < 0.47) return 'battery';
    if (x < -0.1 && x > -0.37 && z < -0.025 && z > -0.39) return 'ram';
    if (x < -0.34 && z > -0.015 && z < 0.13) return 'wifi';
    if (x > -0.03 && x < 0.31 && z > -0.045 && z < 0.12) return 'ssd';
    if (x > 0.11 && x < 0.34 && z > -0.35 && z < -0.07) return 'fan';
    if (x > -0.1 && x < 0.39 && z < -0.07 && z > -0.46) return 'heatpipe';
    if (Math.abs(x) > 0.4 && z > 0.11) return 'speakers';
    return 'motherboard';
  }
  const ids: LaptopPartId[] = [
    'base',
    'motherboard',
    'battery',
    'ram',
    'ssd',
    'wifi',
    'fan',
    'heatpipe',
    'speakers',
  ];
  const result: Partial<Record<LaptopPartId, PreparedLaptopPiece>> = {};
  for (const id of ids) {
    const part = new Group();
    for (const mesh of meshes) {
      const piece = subset(mesh, (p) => region(p) === id);
      if (piece) part.add(piece);
    }
    result[id] = centered(part);
  }
  meshes.forEach((mesh) => mesh.geometry.dispose());
  return result;
}

export function prepareLaptopShell(
  source: Object3D,
): Record<'base' | 'screen' | 'keyboard' | 'lowerCover', PreparedLaptopPiece> {
  const meshes = bakedMeshes(source);
  const all = new Group();
  meshes.forEach((mesh) => all.add(mesh));
  const b = new Box3().setFromObject(all);
  const scale = 8 / (b.max.x - b.min.x);
  const deckY = 1.0146;
  const centerZ = -0.006;
  const result = {} as Record<'base' | 'screen' | 'keyboard' | 'lowerCover', PreparedLaptopPiece>;
  for (const id of ['base', 'screen', 'keyboard', 'lowerCover'] as const) {
    const group = new Group();
    for (const mesh of meshes) {
      const piece = subset(mesh, (p) => {
        if (id === 'screen') return p.y > 1.026;
        if (id === 'keyboard') return mesh.name.includes('003');
        if (id === 'lowerCover') return p.y < 0.988;
        return (
          !mesh.name.includes('003') &&
          p.y >= 0.988 &&
          p.y <= 1.026 &&
          (Math.abs(p.x) > 0.33 || Math.abs(p.z - centerZ) > 0.22)
        );
      });
      if (!piece) continue;
      piece.geometry.applyMatrix4(
        new Matrix4()
          .makeScale(scale, scale, scale)
          .setPosition(0, -deckY * scale + 0.75, -centerZ * scale),
      );
      // The downloaded display contains a desktop screenshot; use a neutral off-screen material.
      if (id === 'screen' && mesh.name.includes('002'))
        piece.material = new MeshStandardMaterial({ color: '#102b40', roughness: 0.35 });
      group.add(piece);
    }
    result[id] = centered(group);
  }
  meshes.forEach((mesh) => mesh.geometry.dispose());
  return result;
}

export function prepareCompleteLaptop(source: Object3D): PreparedLaptopPiece {
  const copy = source.clone(true);
  const rotated = new Group();
  rotated.rotation.y = Math.PI / 2;
  rotated.add(copy);
  rotated.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(rotated);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = 8 / size.x;
  rotated.scale.setScalar(scale);
  // This mesh contains a few remote vertices below the visible chassis.
  // Align the visible deck with the assembly instead of making it float.
  rotated.position.set(
    -center.x * scale,
    -1.55 - bounds.min.y * scale,
    2.72 - bounds.max.z * scale,
  );
  rotated.updateMatrixWorld(true);
  const finalBounds = new Box3().setFromObject(rotated);
  const finalCenter = finalBounds.getCenter(new Vector3());
  const finalSize = finalBounds.getSize(new Vector3());
  return {
    object: rotated,
    center: finalCenter.toArray(),
    size: finalSize.toArray(),
  };
}

export function prepareAcerParts(
  source: Object3D,
): Record<'screen' | 'keyboard', PreparedLaptopPiece> {
  const complete = prepareCompleteLaptop(source);
  const meshes = bakedMeshes(complete.object);
  const result = {} as Record<'screen' | 'keyboard', PreparedLaptopPiece>;
  for (const id of ['screen', 'keyboard'] as const) {
    const group = new Group();
    for (const mesh of meshes) {
      const piece = subset(mesh, (point) => {
        if (id === 'screen') return point.y >= 1.05;
        return point.y > 0.35 && point.y < 1.05 && point.z > -2.9;
      });
      if (piece) group.add(piece);
    }
    result[id] = centered(group);
  }
  meshes.forEach((mesh) => mesh.geometry.dispose());
  return result;
}
