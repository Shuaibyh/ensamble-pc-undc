import {
  Box3,
  BoxGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { laptopNodes } from '../data/laptop';
import type { LaptopPartId } from '../domain/laptop';

export function prepareAssemblyLaptop(source: Object3D) {
  source.updateMatrixWorld(true);
  // The original is upside down. One rigid rotation preserves every attachment.
  const orientation = new Matrix4().makeRotationZ(Math.PI);
  const bounds = new Box3().setFromObject(source).applyMatrix4(orientation);
  const center = bounds.getCenter(new Vector3());
  const scale = 8 / bounds.getSize(new Vector3()).x;
  const transform = new Matrix4()
    .makeTranslation(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    .multiply(new Matrix4().makeScale(scale, scale, scale))
    .multiply(orientation);
  const pieces = {} as Record<LaptopPartId, Group>;
  const positions = {} as Record<LaptopPartId, Vector3>;
  for (const [id, name] of Object.entries(laptopNodes)) {
    const node = source.getObjectByName(name);
    if (!node) throw new Error('Falta el nodo ' + name);
    const wrapper = new Group();
    const clone = node.clone(true);
    clone.traverse((child) => {
      child.matrixWorldAutoUpdate = true;
      if (child instanceof Mesh) {
        const tune = (original: MeshStandardMaterial) => {
          const material = original.clone();
          if (['base', 'screen', 'lowerCover', 'keyboard', 'touchpad'].includes(id)) {
            if (
              material.name.startsWith('\u0447\u0435\u0440\u043d\u044b\u0439') ||
              material.name.startsWith('\u0441\u0435\u0440\u044b\u043940')
            ) {
              material.color.set(id === 'keyboard' ? '#303236' : '#242629');
              material.roughness = 0.8;
              material.metalness = 0;
            }
            if (
              (id === 'screen' && material.name === '\u0431\u0435\u043b\u044b\u0439.020') ||
              (['lowerCover', 'touchpad'].includes(id) &&
                material.name === '\u0431\u0435\u043b\u044b\u0439.018')
            ) {
              material.color.set('#292b2e');
              material.roughness = 0.85;
            }
          }
          if (id === 'screen' && material.name === '\u0441\u0442\u0435\u043a\u043b\u043e.001') {
            material.color.set('#10151b');
            material.transparent = false;
            material.opacity = 1;
            material.emissive.set(0);
            child.userData.laptopDisplay = true;
            child.geometry = child.geometry.clone();
            child.geometry.computeBoundingBox();
            const box = child.geometry.boundingBox!;
            const positions = child.geometry.getAttribute('position');
            const uv = [];
            // Project across the actual display, preserving its original shape and bevel.
            for (let i = 0; i < positions.count; i++) {
              uv.push(
                (positions.getX(i) - box.min.x) / (box.max.x - box.min.x),
                (positions.getZ(i) - box.min.z) / (box.max.z - box.min.z),
              );
            }
            child.geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
          }
          return material;
        };
        child.material = Array.isArray(child.material)
          ? child.material.map(tune)
          : tune(child.material as MeshStandardMaterial);
      }
    });
    clone.matrixAutoUpdate = false;
    clone.matrix.multiplyMatrices(transform, node.matrixWorld);
    clone.matrixWorldNeedsUpdate = true;
    wrapper.add(clone);
    pieces[id as LaptopPartId] = wrapper;
    positions[id as LaptopPartId] = new Box3().setFromObject(wrapper).getCenter(new Vector3());
  }
  const screws = new Group();
  source.traverse((node) => {
    if (!node.name.startsWith('box_Cylinder')) return;
    const clone = node.clone(true);
    clone.traverse((child) => {
      child.matrixWorldAutoUpdate = true;
    });
    clone.matrixAutoUpdate = false;
    clone.matrix.multiplyMatrices(transform, node.matrixWorld);
    clone.matrixWorldNeedsUpdate = true;
    screws.add(clone);
  });
  pieces.screws = screws;
  positions.screws = new Box3().setFromObject(screws).getCenter(new Vector3());
  // Rear service opening: this cover follows the removable top case.
  const hingeDeck = new Mesh(
    new BoxGeometry(7.2, 0.06, 0.82),
    new MeshStandardMaterial({ color: '#292b2e', roughness: 0.85, metalness: 0 }),
  );
  hingeDeck.name = 'Rear_keyboard_service_cover';
  hingeDeck.position.set(0, 0.665, -1.58);
  pieces.lowerCover.add(hingeDeck);
  return { pieces, positions };
}
