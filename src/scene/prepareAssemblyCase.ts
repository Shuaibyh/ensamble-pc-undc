import {
  BufferGeometry,
  BoxGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { casePlacement } from '../data/assemblyModels';

function openSidePanel(mesh: Mesh, geometries: BufferGeometry[]) {
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const kept: number[] = [];

  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const triangle = [0, 1, 2].map((offset) => (index ? index.getX(i + offset) : i + offset));
    const vertices = triangle.map((vertex) => new Vector3().fromBufferAttribute(position, vertex));
    const centroid = vertices
      .reduce((sum, vertex) => sum.add(vertex), new Vector3())
      .multiplyScalar(1 / 3);
    const sidePanel = centroid.z > 0.135 && centroid.y > 0.025 && centroid.y < 0.38;
    if (!sidePanel) kept.push(...triangle);
  }

  geometry.setIndex(kept);
  mesh.geometry = geometry;
  geometries.push(geometry);
}

function cloneReadableMaterials(object: Object3D, materials: MeshStandardMaterial[]) {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const originals = Array.isArray(child.material) ? child.material : [child.material];
    const copies = originals.map((material) => {
      const copy = material.clone();
      if (!(copy instanceof MeshStandardMaterial)) return copy;
      copy.map = null;
      copy.color.set(child.name === 'Object_4' ? '#6f89a4' : '#aebdcc');
      copy.roughness = Math.min(Math.max(copy.roughness, 0.42), 0.76);
      copy.metalness = Math.min(copy.metalness, 0.35);
      copy.envMapIntensity = 1.1;
      materials.push(copy);
      return copy;
    });
    child.material = Array.isArray(child.material) ? copies : copies[0];
  });
}

function prepareOpenGenericCase(body: Object3D) {
  const panels: Object3D[] = [];
  const geometries: BufferGeometry[] = [];
  const materials: MeshStandardMaterial[] = [];

  body.traverse((object) => {
    const name = object.name.toLowerCase();
    if (name.includes('fan_rim') || name.includes('fan_blade')) object.visible = false;
  });

  cloneReadableMaterials(body, materials);
  body.traverse((object) => {
    if (object instanceof Mesh && object.name === 'Object_4') openSidePanel(object, geometries);
  });

  const panelMaterial = new MeshPhysicalMaterial({
    color: '#7dcbed',
    transparent: true,
    opacity: 0.18,
    roughness: 0.18,
    metalness: 0,
    depthWrite: false,
  });
  const panelGeometry = new BoxGeometry(0.33, 0.34, 0.008);
  const panel = new Mesh(panelGeometry, panelMaterial);
  panel.name = 'panel_lateral_didactico';
  panel.position.set(0, 0.2, 0.192);
  panels.push(panel);
  geometries.push(panelGeometry);
  materials.push(panelMaterial);

  const coverMaterial = new MeshStandardMaterial({
    color: '#6d8aa3',
    roughness: 0.62,
    metalness: 0.18,
  });
  const coverGeometry = new BoxGeometry(0.27, 0.025, 0.22);
  const cover = new Mesh(coverGeometry, coverMaterial);
  cover.name = 'cubierta_fuente_didactica';
  cover.position.set(-0.055, 0.045, -0.012);
  panels.push(cover);
  geometries.push(coverGeometry);
  materials.push(coverMaterial);

  const oriented = new Group();
  oriented.rotation.set(...casePlacement.rotation);
  oriented.add(body, panel, cover);

  const result = new Group();
  result.scale.setScalar(casePlacement.scale);
  result.position.set(...casePlacement.center).multiplyScalar(-casePlacement.scale);
  result.add(oriented);

  return { object: result, panels, geometries, materials };
}

// Los grupos originales permiten abrir el cristal sin cortar la geometría del case.
export function prepareAssemblyCase(source: Object3D) {
  const body = source.clone(true);
  // En el ejercicio se parte del chasis vacío; la biblioteca conserva el GLB original.
  for (const name of ['fan_base', 'fan_base001', 'fan_base002', 'fan_base003']) {
    body.getObjectByName(name)?.removeFromParent();
  }
  const glass = body.getObjectByName('glass');
  if (!glass) return prepareOpenGenericCase(body);
  const panels: Object3D[] = [glass];
  const geometries: BufferGeometry[] = [];
  const materials: MeshStandardMaterial[] = [];
  body.updateMatrixWorld(true);
  const inside = body.getObjectByName('inside')?.children[0];
  if (!(inside instanceof Mesh)) throw new Error('Interior del gabinete ausente');
  const position = inside.geometry.getAttribute('position');
  const index = inside.geometry.index;
  const interiorIndices: number[] = [];
  const coverIndices: number[] = [];
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const triangle = [0, 1, 2].map((offset) => (index ? index.getX(i + offset) : i + offset));
    const vertices = triangle.map((vertex) =>
      new Vector3().fromBufferAttribute(position, vertex).applyMatrix4(inside.matrixWorld),
    );
    // Se separan caras completas de la cubierta inferior, sin cortar triángulos.
    const onCover =
      vertices.every((vertex) => vertex.y <= 0.145) && vertices.some((vertex) => vertex.x < 0.08);
    (onCover ? coverIndices : interiorIndices).push(...triangle);
  }
  const interior = inside.geometry.clone();
  interior.setIndex(interiorIndices);
  const coverGeometry = inside.geometry.clone();
  coverGeometry.setIndex(coverIndices);
  geometries.push(interior, coverGeometry);
  const cover = inside.clone();
  cover.name = 'cubierta_fuente_didactica';
  cover.geometry = coverGeometry;
  inside.geometry = interior;
  inside.parent!.add(cover);
  panels.push(cover);
  body.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const original = object.material as MeshStandardMaterial;
    const material = original.clone();
    // El GLB multiplica varias texturas por negro puro: no reflejan luz.
    // Se corrige el color base, conservando texturas, mapas normales y perforaciones.
    material.color.set(
      object.name.startsWith('inside') || object.name === cover.name ? '#8ba8bd' : '#344e6b',
    );
    if (object.name.startsWith('fan')) material.color.set('#23334a');
    if (object.name.startsWith('glass')) {
      material.color.set('#7dcbed');
      material.transparent = true;
      material.opacity = 0.2;
      material.depthWrite = false;
      if (material instanceof MeshPhysicalMaterial) material.transmission = 0;
    }
    material.roughness = Math.min(Math.max(material.roughness, 0.38), 0.72);
    material.metalness = Math.min(material.metalness, 0.45);
    materials.push(material);
    object.material = material;
  });
  const oriented = new Group();
  oriented.rotation.set(...casePlacement.rotation);
  oriented.add(body);
  const result = new Group();
  result.scale.setScalar(casePlacement.scale);
  result.position.set(...casePlacement.center).multiplyScalar(-casePlacement.scale);
  result.add(oriented);
  return { object: result, panels, geometries, materials };
}
