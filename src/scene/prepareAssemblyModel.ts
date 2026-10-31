import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import type { AssemblyModel } from '../data/assemblyModels';

// Conserva la transformación acumulada de los grupos al separarlos del GLB.
export function prepareAssemblyModel(source: Object3D, definition: AssemblyModel) {
  source.updateMatrixWorld(true);
  const original = definition.node ? source.getObjectByName(definition.node) : source;
  if (!original) throw new Error(`No existe el grupo ${definition.node}`);
  const object = original.clone(true);
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const originals = Array.isArray(child.material) ? child.material : [child.material];
    const materials = originals.map((material) => {
      const copy = material.clone();
      if (!(copy instanceof MeshStandardMaterial)) return copy;
      const brightest = Math.max(copy.color.r, copy.color.g, copy.color.b);
      if (brightest < 0.12) copy.color.offsetHSL(0, 0.06, 0.1);
      copy.roughness = Math.min(Math.max(copy.roughness, 0.28), 0.78);
      copy.envMapIntensity = 1.15;
      return copy;
    });
    child.material = Array.isArray(child.material) ? materials : materials[0];
  });
  object.matrix.copy(original.matrixWorld);
  object.matrixAutoUpdate = false;
  definition.exclude?.forEach((name) => object.getObjectByName(name)?.removeFromParent());
  const oriented = new Group();
  oriented.rotation.set(...definition.rotation);
  oriented.add(object);
  oriented.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(oriented);
  const size = bounds.getSize(new Vector3());
  const length = size[definition.referenceAxis];
  if (!Number.isFinite(length) || length <= 0) throw new Error('Modelo sin volumen válido');
  const scale = definition.referenceLength / length;
  const centered = new Group();
  centered.add(oriented);
  centered.position.copy(bounds.getCenter(new Vector3()).negate().multiplyScalar(scale));
  oriented.scale.setScalar(scale);
  const result = new Group();
  result.add(centered);
  result.updateMatrixWorld(true);
  return result;
}
