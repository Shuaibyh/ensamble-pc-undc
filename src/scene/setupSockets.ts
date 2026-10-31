import { Matrix4, Object3D, Quaternion, Vector3 } from 'three';
import anchors from '../data/setupSocketAnchors.json';

export type SocketId = keyof typeof anchors;
export interface SocketFrame {
  surface: Vector3;
  tip: Vector3;
  quaternion: Quaternion;
  inward: Vector3;
  depth: number;
  height: number;
  width: number;
}

/** Landmarks are in the actual GLB mesh's local space, before parent transforms. */
export function resolveSocketFrame(
  device: Object3D,
  id: SocketId,
  cableParent: Object3D,
): SocketFrame | null {
  const definition = anchors[id];
  const mesh = device.getObjectByName(definition.mesh);
  if (!mesh) return null;
  mesh.updateWorldMatrix(true, false);
  cableParent.updateWorldMatrix(true, false);
  const point = (coordinates: number[]) =>
    cableParent.worldToLocal(mesh.localToWorld(new Vector3().fromArray(coordinates)));
  const surface = point(definition.surface);
  const tip = point(definition.tip);
  const inward = tip.clone().sub(surface).normalize();
  const up = point(definition.up).sub(surface);
  const side = point(definition.side).sub(surface);
  const height = 2 * up.length();
  const width = 2 * side.length();
  up.addScaledVector(inward, -up.dot(inward)).normalize();
  const right = inward.clone().cross(up).normalize();
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(inward, up, right),
  );
  return { surface, tip, inward, quaternion, depth: tip.distanceTo(surface), height, width };
}

/** Solve the plug origin from its physical tip, including nonzero mesh pivots. */
export function plugMatrix(frame: SocketFrame, plugTipLocal: Matrix4, travel = 0) {
  return new Matrix4()
    .compose(
      frame.tip.clone().addScaledVector(frame.inward, -travel),
      frame.quaternion,
      new Vector3(1, 1, 1),
    )
    .multiply(plugTipLocal.clone().invert());
}
