import { Box3, Group, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { pcGroups, pcModel, type PcGroupId } from '../data/pcModel';

export function pcGroupFor(object: Object3D): PcGroupId {
  const ancestors: string[] = [];
  for (let current: Object3D | null = object; current; current = current.parent)
    ancestors.push(current.name);
  for (const [id, names] of Object.entries(pcGroups))
    if (names.some((name) => ancestors.includes(name))) return id as PcGroupId;
  return ancestors.includes('Empty001_44') ? 'board' : 'chassis';
}

export function preparePcModel(source: Object3D) {
  source.updateMatrixWorld(true);
  const normalization = new Matrix4().makeScale(pcModel.scale, pcModel.scale, pcModel.scale);
  normalization.setPosition(...pcModel.offset);
  const groups = Object.fromEntries(
    ['chassis', 'board', ...Object.keys(pcGroups)].map((id) => [id, new Group()]),
  ) as Record<PcGroupId, Group>;
  const cover = new Group();
  source.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const mesh = object.clone(false);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.multiplyMatrices(normalization, object.matrixWorld);
    groups[pcGroupFor(object)].add(mesh);
    // The source supplies only the rear-side sheet. Its mirrored counterpart
    // closes the open service side with the same dimensions and material.
    if (object.parent?.name === 'case_sideR_48') {
      const outer = mesh.clone(false);
      outer.matrix.premultiply(new Matrix4().makeScale(1, 1, -1));
      cover.add(outer);
    }
  });
  const targets = Object.fromEntries(
    Object.entries(groups).map(([id, group]) => {
      group.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(group);
      return [
        id,
        {
          position: bounds.getCenter(new Vector3()).toArray(),
          size: bounds.getSize(new Vector3()).toArray(),
        },
      ];
    }),
  );
  return { groups, targets, cover };
}
