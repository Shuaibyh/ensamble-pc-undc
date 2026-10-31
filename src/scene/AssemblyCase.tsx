import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { casePlacement } from '../data/assemblyModels';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { prepareAssemblyCase } from './prepareAssemblyCase';
import { Chassis } from './Chassis';
import { Box } from './primitives';
import { CaseClosureScrews } from './CaseClosureScrews';

function LoadedCase({ panelVisible, powered }: { panelVisible: boolean; powered: boolean }) {
  const { scene } = useGLTF(casePlacement.path, false, false);
  const prepared = useMemo(() => prepareAssemblyCase(scene), [scene]);

  useLayoutEffect(() => {
    prepared.panels.forEach((panel) => {
      panel.visible = panelVisible;
    });
  }, [prepared, panelVisible, powered]);

  useEffect(
    () => () => {
      prepared.geometries.forEach((geometry) => geometry.dispose());
      prepared.materials.forEach((material) => material.dispose());
    },
    [prepared],
  );

  return (
    <>
      <primitive object={prepared.object} />
      {panelVisible && <CaseClosureScrews />}
      <Box
        position={[1.96, 1.62, 0.65]}
        size={[0.06, 0.06, 0.06]}
        color={powered ? '#54efb1' : '#73849b'}
        glow={powered}
      />
    </>
  );
}

export function AssemblyCase({
  panelVisible,
  powered,
}: {
  panelVisible: boolean;
  powered: boolean;
}) {
  return (
    <ErrorBoundary fallback={<Chassis powered={powered} panelVisible={panelVisible} />}>
      <Suspense
        fallback={
          <Html center>
            <span className="resource-message">Preparando el gabinete abierto...</span>
          </Html>
        }
      >
        <LoadedCase panelVisible={panelVisible} powered={powered} />
      </Suspense>
    </ErrorBoundary>
  );
}
