import { Group, Mesh, Object3D } from 'three';
import { assemblyModels } from '../data/assemblyModels';
import { mountingOffsets } from '../data/assemblyDetails';
import type { PartId } from '../domain/types';
import { prepareAssemblyModel } from './prepareAssemblyModel';

export function prepareDetailedPart(source: Object3D, id: PartId) {
  const model = prepareAssemblyModel(source, assemblyModels[id]);
  if (id === 'standoffs' || id === 'board-screws') {
    const result = new Group();
    mountingOffsets.forEach((position) => {
      const copy = model.clone(true);
      copy.position.set(...position);
      result.add(copy);
    });
    return result;
  }
  if (id.startsWith('fan-')) {
    const rotor = new Group();
    rotor.name = 'rotor-educativo';
    model.add(rotor);
    model.updateMatrixWorld(true);
    const blades: Object3D[] = [];
    model.traverse((object) => {
      if (object instanceof Mesh && /^Extruded00[13456789]_/.test(object.name)) blades.push(object);
    });
    // attach conserva la posición tras separar aspas y núcleo del marco.
    blades.forEach((blade) => rotor.attach(blade));
  }
  return model;
}
