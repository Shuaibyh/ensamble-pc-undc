import { Box3, Group, Matrix4, Mesh, Object3D, Plane, Quaternion, Ray, Vector3 } from 'three';

/** Original mesh transforms remain inside the centered wrapper, including GLB
 * negative/nonuniform scales. Only this outer wrapper is moved or rotated. */
export function createPlacementFrame(source: Object3D, rotationAxis?: Vector3) {
  const model = source.clone(true);
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model, true);
  const position = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const centered = new Group();
  centered.position.copy(position).negate();
  centered.add(model);
  const shortestAxis = size.x <= size.y && size.x <= size.z ? 'x' : size.y <= size.z ? 'y' : 'z';
  const normal =
    rotationAxis?.clone().normalize() ?? new Vector3().setComponent('xyz'.indexOf(shortestAxis), 1);
  return {
    centered,
    // Identity here means the ORIGINAL installation orientation, already retained
    // in model's descendants. It does not mean resetting the original GLB rotation.
    target: { position, quaternion: new Quaternion() },
    size,
    rotationAxis: normal,
    tolerance: Math.max(0.045, Math.min(0.18, Math.max(size.x, size.y, size.z) * 0.08)),
  };
}

/** Normal of the largest original face, useful for an inclined laptop display.
 * Use actual transformed vertices so parent rotations/scales are respected. */
export function largestFaceNormal(source: Object3D) {
  const model = source.clone(true);
  model.updateMatrixWorld(true);
  let largest = 0;
  const normal = new Vector3(0, 0, 1);
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const positions = child.geometry.getAttribute('position');
    const indices = child.geometry.index;
    const count = indices?.count ?? positions.count;
    for (let i = 0; i + 2 < count; i += 3) {
      a.fromBufferAttribute(positions, indices ? indices.getX(i) : i).applyMatrix4(
        child.matrixWorld,
      );
      b.fromBufferAttribute(positions, indices ? indices.getX(i + 1) : i + 1).applyMatrix4(
        child.matrixWorld,
      );
      c.fromBufferAttribute(positions, indices ? indices.getX(i + 2) : i + 2).applyMatrix4(
        child.matrixWorld,
      );
      const cross = b.sub(a).cross(c.sub(a));
      if (cross.lengthSq() > largest) {
        largest = cross.lengthSq();
        normal.copy(cross).normalize();
      }
    }
  });
  const major =
    Math.abs(normal.x) > Math.abs(normal.y)
      ? Math.abs(normal.x) > Math.abs(normal.z)
        ? normal.x
        : normal.z
      : Math.abs(normal.y) > Math.abs(normal.z)
        ? normal.y
        : normal.z;
  if (major < 0) normal.negate();
  return normal;
}

/** The view-facing plane goes THROUGH the same installation anchor as the ghost.
 * Convert world ray hits back to assembly coordinates; pixels never become 3D positions. */
export function placementDragPlane(
  target: Vector3,
  assemblyWorld: Matrix4,
  cameraDirection: Vector3,
) {
  return new Plane().setFromNormalAndCoplanarPoint(
    cameraDirection.clone().normalize(),
    target.clone().applyMatrix4(assemblyWorld),
  );
}
export function placementRayHit(ray: Ray, plane: Plane, assemblyWorld: Matrix4) {
  if (Math.abs(ray.direction.dot(plane.normal)) < 1e-6) return null;
  const hit = ray.intersectPlane(plane, new Vector3());
  return hit?.applyMatrix4(assemblyWorld.clone().invert()) ?? null;
}
