import type { Part } from '../domain/types';
import { Box, Fan } from './primitives';
// Geometrías de respaldo independientes de los archivos GLB y de las reglas.
export function ProceduralPart({ part, powered }: { part: Part; powered: boolean }) {
  const id = part.id;
  return (
    <group>
      <Box size={part.size} color={part.color} />
      {id === 'board' && (
        <>
          <Box position={[-0.18, 0.49, 0.09]} size={[0.68, 0.68, 0.08]} color="#89909b" />
          {[0.6, 0.79].map((x) => (
            <Box key={x} position={[x, 0.5, 0.1]} size={[0.09, 1.25, 0.09]} color="#141b27" />
          ))}
          <Box position={[0, -0.88, 0.09]} size={[1.7, 0.1, 0.1]} color="#b5c1ce" />
          <Box position={[-0.9, 0.45, 0.18]} size={[0.3, 1.3, 0.27]} color="#8c9cab" />
          {Array.from({ length: 8 }, (_, i) => (
            <Box
              key={i}
              position={[-0.67 + i * 0.2, 1.05, 0.13]}
              size={[0.11, 0.17, 0.14]}
              color="#202635"
            />
          ))}
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((y) => (
              <mesh key={`${x}${y}`} position={[x, y, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.035, 12]} />
                <meshStandardMaterial color="#d9dfeb" />
              </mesh>
            )),
          )}
        </>
      )}
      {id === 'cpu' && (
        <>
          <Box position={[0, 0, 0.068]} size={[0.43, 0.43, 0.02]} color="#e0e5e7" />
          <Box position={[-0.21, -0.21, 0.085]} size={[0.055, 0.055, 0.01]} color="#e6bd56" />
        </>
      )}
      {id === 'cooler' && (
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <Box
              key={i}
              position={[0, -0.39 + i * 0.085, 0.01]}
              size={[0.91, 0.025, 0.72]}
              color="#bdcbd7"
            />
          ))}
          <Fan position={[0, 0, 0.4]} powered={powered} />
        </>
      )}
      {id === 'ram' && (
        <>
          <Box position={[0, 0, 0.19]} size={[0.16, 1.1, 0.035]} color="#8caaff" glow={powered} />
          {Array.from({ length: 5 }, (_, i) => (
            <Box
              key={i}
              position={[0.085, -0.4 + i * 0.2, 0]}
              size={[0.04, 0.13, 0.21]}
              color="#171c28"
            />
          ))}
        </>
      )}
      {id === 'ssd' && (
        <>
          {[-0.22, 0, 0.22].map((x) => (
            <Box key={x} position={[x, 0, 0.08]} size={[0.16, 0.18, 0.045]} color="#202635" />
          ))}
          <Box position={[0.39, 0, 0.065]} size={[0.06, 0.23, 0.04]} color="#d4b767" />
        </>
      )}
      {id === 'gpu' && (
        <>
          <Box position={[0, 0.225, 0]} size={[2.12, 0.03, 1.07]} color="#8192aa" />
          <Box position={[0, 0, 0.575]} size={[1.88, 0.08, 0.025]} color="#628fff" glow={powered} />
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <Fan position={[-0.53, 0, -0.24]} radius={0.39} powered={powered} />
            <Fan position={[0.53, 0, -0.24]} radius={0.39} powered={powered} />
          </group>
        </>
      )}
      {id === 'psu' && (
        <>
          <Fan position={[0, 0, 0.7]} radius={0.29} powered={powered} />
          <Box position={[-0.51, 0, 0.69]} size={[0.18, 0.25, 0.04]} color="#151b26" />
        </>
      )}
    </group>
  );
}
