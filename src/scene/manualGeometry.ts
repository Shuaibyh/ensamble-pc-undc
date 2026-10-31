import { Box3, Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';

// These clones share the original geometry. Only their preview materials are owned here.
export function ghostOf(object: Object3D) {
  const ghost = object.clone(true);
  const material = new MeshBasicMaterial({
    color: '#56dafa',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    depthTest: false,
  });
  ghost.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = material;
      child.raycast = () => {};
    }
  });
  return { object: ghost, material };
}

export function fastenersFrom(object: Group, combined = false): Group[] {
  object.updateMatrixWorld(true);
  if (!combined)
    return object.children.map((child) => {
      const group = new Group();
      group.add(child.clone(true));
      return group;
    });
  // The desktop GLB batches all bolts into one mesh. Partition its triangles by
  // their separated XY footprints, retaining every original vertex and transform.
  const result: Group[] = [];
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const geometry = child.geometry;
    const position = geometry.getAttribute('position');
    const count = geometry.index?.count ?? position.count;
    const clusters: { point: Vector3; indices: number[] }[] = [];
    for (let i = 0; i < count; i += 3) {
      const indices = [0, 1, 2].map((j) => (geometry.index ? geometry.index.getX(i + j) : i + j));
      const point = new Vector3()
        .fromBufferAttribute(position, indices[0])
        .applyMatrix4(child.matrixWorld);
      let cluster = clusters.find(
        (c) => Math.hypot(c.point.x - point.x, c.point.y - point.y) < 0.2,
      );
      if (!cluster) {
        cluster = { point, indices: [] };
        clusters.push(cluster);
      }
      cluster.indices.push(...indices);
    }
    for (const cluster of clusters) {
      const mesh = child.clone(false);
      mesh.geometry = geometry.clone();
      mesh.geometry.setIndex(cluster.indices);
      mesh.geometry.clearGroups();
      // Bounds must only include this screw, not unused vertices of the batch.
      mesh.geometry = mesh.geometry.toNonIndexed();
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(child.matrixWorld);
      const group = new Group();
      group.add(mesh);
      result.push(group);
    }
  });
  return result.sort((a, b) => {
    const ca = new Box3().setFromObject(a).getCenter(new Vector3());
    const cb = new Box3().setFromObject(b).getCenter(new Vector3());
    return cb.y - ca.y || ca.x - cb.x;
  });
}
