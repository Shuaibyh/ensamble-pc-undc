import { Grid } from '@react-three/drei';

export function Lighting({
  groundY = -2.33,
  fogNear = 12,
  fogFar = 25,
}: {
  groundY?: number;
  fogNear?: number;
  fogFar?: number;
}) {
  return (
    <>
      <color attach="background" args={['#14243b']} />
      <fog attach="fog" args={['#14243b', fogNear, fogFar]} />
      <hemisphereLight args={['#dff5ff', '#405273', 1.85]} />
      <ambientLight intensity={0.65} color="#d8eaff" />
      <directionalLight
        position={[-3, 5, 6]}
        intensity={2.75}
        color="#f4fbff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[4, 2, 5]} intensity={1.65} color="#70c9ff" />
      <directionalLight position={[-2, 1, -3]} intensity={1.2} color="#b995ff" />
      <pointLight position={[0, 0, 4]} intensity={18} distance={11} color="#4ce4ff" />
      <pointLight position={[3, 0, -2]} intensity={12} distance={8} color="#8e72ff" />
      <Grid
        position={[0, groundY, 0]}
        args={[16, 16]}
        cellSize={0.5}
        cellColor="#31506c"
        sectionSize={2}
        sectionColor="#3f83ad"
        fadeDistance={13}
      />
    </>
  );
}
