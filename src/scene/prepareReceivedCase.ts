import { Box3, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';

// Escala uniforme para encuadrar una exhibición, nunca para validar compatibilidad.
export function prepareReceivedCase(source: Object3D) {
  const scene = source.clone(true);
  scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());
  const maximum = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maximum) || maximum <= 0) throw new Error('Modelo sin geometría visible');
  const scale = 5 / maximum;
  const center = bounds.getCenter(new Vector3());
  const windows: Object3D[] = [];
  const materials: { material: MeshStandardMaterial; original: MeshStandardMaterial }[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const clones = originals.map((original) => {
      const material = original.clone();
      if (material instanceof MeshStandardMaterial && original instanceof MeshStandardMaterial) {
        materials.push({ material, original });
      }
      return material;
    });
    object.material = Array.isArray(object.material) ? clones : clones[0];
    if (originals.some((material) => material.name === 'Window')) windows.push(object);
  });
  return { scene, windows, materials, scale, position: center.multiplyScalar(-scale) };
}
