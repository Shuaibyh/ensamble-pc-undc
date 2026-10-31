// Reproduce the attachment landmarks from the shipped GLBs, not chassis bounds.
import { readFile, writeFile } from 'node:fs/promises';
import { Box3, Mesh, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { preparePcModel } from '../src/scene/preparePcModel';
import { preparePeripheralModel } from '../src/scene/preparePeripheralModel';
import { peripherals } from '../src/data/peripherals';

async function load(path: string) {
  const bytes = await readFile(`public${path}`);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.register(() => ({ name: 'measure', loadTexture: () => Promise.resolve(new Texture()) }));
  return (
    await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene;
}

function vertices(mesh: Mesh) {
  const p = mesh.geometry.attributes.position;
  return Array.from({ length: p.count }, (_, i) =>
    new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld),
  );
}

// Weld duplicated UV/normal seam vertices before identifying separate socket shells.
function islands(mesh: Mesh, local = false) {
  const points = vertices(mesh);
  if (local) points.forEach((p) => mesh.worldToLocal(p));
  const keys = points.map((v) =>
    v
      .toArray()
      .map((n) => n.toFixed(5))
      .join(','),
  );
  const parent = new Map(keys.map((k) => [k, k]));
  const root = (k: string): string => (parent.get(k) === k ? k : root(parent.get(k)!));
  const ix = mesh.geometry.index!.array;
  for (let i = 0; i < ix.length; i += 3)
    for (let j = 1; j < 3; j++) parent.set(root(keys[ix[i + j]]), root(keys[ix[i]]));
  const groups = new Map<string, Vector3[]>();
  points.forEach((p, i) => {
    const k = root(keys[i]);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  });
  return [...groups.values()].map((p) => new Box3().setFromPoints(p));
}

const pc = preparePcModel(await load('/models/creagal/desktop.glb')).groups;
Object.values(pc).forEach((g) => g.updateMatrixWorld(true));
const monitor = preparePeripheralModel(
  await load(peripherals.monitor.path),
  'x',
  peripherals.monitor.length,
  peripherals.monitor.rotation,
  peripherals.monitor.exclude,
);
monitor.updateMatrixWorld(true);
const usb = pc.board.getObjectByName('Object_94') as Mesh;
const gpu = pc.gpu.getObjectByName('Object_26') as Mesh;
const psu = pc.psu.getObjectByName('Object_5') as Mesh;
const monitorPorts = monitor.getObjectByName('Cube_USB_0') as Mesh;

function landmark(mesh: Mesh, bounds: Box3, device: string, insertion: 'x' | 'z') {
  const center = bounds.getCenter(new Vector3());
  const surface = center.clone();
  surface[insertion] = bounds.min[insertion];
  const tip = center.clone();
  tip[insertion] = bounds.max[insertion];
  const up = surface.clone();
  up.y = bounds.max.y;
  const side = surface.clone();
  // X cross Y = Z; Z cross Y = -X.
  if (insertion === 'x') side.z = bounds.max.z;
  else side.x = bounds.min.x;
  const local = (p: Vector3) => mesh.worldToLocal(p).toArray();
  return {
    device,
    mesh: mesh.name,
    surface: local(surface),
    tip: local(tip),
    up: local(up),
    side: local(side),
  };
}

// Object_94 shells #18 and #24 are the two vertically separated USB-A sockets
// in the left column below the video/Ethernet section (confirmed by mesh islands).
const usbShells = islands(usb);
const gpuShell = islands(gpu, true)[1];
// The GPU connector has its own slight rotation in the asset. Preserve it,
// including its inverted Y/Z axes, instead of using an axis-aligned world box.
const gpuCenter = gpuShell.getCenter(new Vector3());
const gpuSurface = gpuCenter.clone();
gpuSurface.x = gpuShell.min.x;
const gpuTip = gpuCenter.clone();
gpuTip.x = gpuShell.max.x;
const gpuUp = gpuSurface.clone();
gpuUp.y = gpuShell.min.y;
const gpuSide = gpuSurface.clone();
gpuSide.z = gpuShell.min.z;
const psuPoints = vertices(psu);
const psuAll = new Box3().setFromPoints(psuPoints);
// The deepest face of this mesh belongs only to the IEC recess, below the switch.
const iec = new Box3().setFromPoints(psuPoints.filter((p) => Math.abs(p.x - psuAll.max.x) < 1e-6));
iec.min.x = psuAll.min.x;
const monitorShells = islands(monitorPorts).sort((a, b) => a.min.x - b.min.x);
const result = {
  'keyboard-usb': landmark(usb, usbShells[18], 'pc', 'x'),
  'mouse-usb': landmark(usb, usbShells[24], 'pc', 'x'),
  video: {
    device: 'pc',
    mesh: gpu.name,
    surface: gpuSurface.toArray(),
    tip: gpuTip.toArray(),
    up: gpuUp.toArray(),
    side: gpuSide.toArray(),
  },
  'pc-power': landmark(psu, iec, 'pc', 'x'),
  // The monitor GLB supplies two unlabelled rear input recesses in Cube_USB_0.
  // Assign the left recess to video and the right one to power; preserve its mesh.
  'monitor-video': landmark(monitorPorts, monitorShells[0], 'monitor', 'z'),
  'monitor-power': landmark(monitorPorts, monitorShells[1], 'monitor', 'z'),
};
await writeFile('src/data/setupSocketAnchors.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
