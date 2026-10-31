export type PartId =
  | 'board'
  | 'cpu'
  | 'cooler'
  | 'ram'
  | 'ssd'
  | 'gpu'
  | 'psu'
  | import('../data/assemblyDetails').DetailId;
export type CableId =
  | 'atx'
  | 'eps'
  | 'pcie'
  | 'fan-top'
  | 'fan-middle'
  | 'fan-bottom'
  | 'fan-rear'
  | 'cpu-fan'
  | 'sata-data'
  | 'sata-power';
export type Vec3 = [number, number, number];
export interface ModelAsset {
  modelPath: string | null;
  thumbnailPath: string;
  scale: Vec3;
  rotation: Vec3;
  anchor: Vec3;
  author: string;
  source: string;
  license: string;
  modifications: string;
}
export interface Part {
  id: PartId;
  name: string;
  category: string;
  spec: string;
  icon: string;
  description: string;
  location: string;
  depends: PartId[];
  position: Vec3;
  size: Vec3;
  color: string;
  asset: ModelAsset;
  specifications: Record<string, string>;
}
