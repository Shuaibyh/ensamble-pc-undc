import { Box3, Group, Mesh, Object3D, Vector3 } from 'three';
import type { Vec3 } from '../domain/types';

/** Escala uniforme del cuerpo, sin incluir cables decorativos. Origen sobre la mesa. */
export function preparePeripheralModel(
  source: Object3D,
  axis: 'x' | 'y' | 'z',
  length: number,
  rotation: Vec3,
  exclude: readonly string[] = [],
  includePrefixes?: readonly string[],
) {
  const object = source.clone(true);
  if (includePrefixes) {
    const unwanted: Object3D[] = [];
    object.traverse((child) => {
      if (
        child instanceof Mesh &&
        !includePrefixes.some((prefix) => child.name.startsWith(prefix))
      ) {
        unwanted.push(child);
      }
    });
    unwanted.forEach((child) => child.removeFromParent());
  }
  for (const name of exclude) object.getObjectByName(name)?.removeFromParent();
  const oriented = new Group();
  oriented.rotation.set(...rotation);
  oriented.add(object);
  oriented.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(oriented);
  const extent = bounds.getSize(new Vector3())[axis];
  if (!Number.isFinite(extent) || extent <= 0 || length <= 0) {
    throw new Error('El modelo no tiene dimensiones válidas.');
  }
  const scale = length / extent;
  oriented.scale.setScalar(scale);
  const center = bounds.getCenter(new Vector3());
  oriented.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const group = new Group();
  group.add(oriented);
  return group;
}
