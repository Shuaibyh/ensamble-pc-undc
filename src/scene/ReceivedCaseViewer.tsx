import { CameraToolbar } from '../components/ui/CameraToolbar';
import { SimulatorHeader } from '../components/ui/SimulatorHeader';
import { Suspense, useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Global3DLoader } from '../components/ui/Global3DLoader';
import { receivedModels, type ReceivedModel as ModelInfo } from '../data/receivedModels';
import { boardGroups, changeBoardGroup, type BoardGroup } from '../domain/receivedAssembly';
import { useFrame } from '@react-three/fiber';
import { CameraRig, initialCamera, type CameraCommand } from './CameraRig';
import { Lighting } from './Lighting';
import { prepareReceivedCase } from './prepareReceivedCase';

const assemblyLibrary = receivedModels;

function modelCategory(model: ModelInfo) {
  if (model.modelPath.includes('/laptops/')) return 'Laptop';
  if (model.modelPath.includes('/peripherals/')) return 'Periféricos';
  if (model.modelPath.includes('/cases/') || model.id === 'case') return 'Gabinetes';
  return 'Componentes';
}

function searchable(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function ReceivedModel({
  asset,
  installed,
  windowVisible,
  readable,
}: {
  asset: ModelInfo;
  installed: BoardGroup[];
  windowVisible: boolean;
  readable: boolean;
}) {
  const { scene } = useGLTF(asset.modelPath, false, true);
  const prepared = useMemo(() => prepareReceivedCase(scene), [scene]);
  const groups = useMemo(() => {
    if (asset.id !== 'motherboard') return [];
    return boardGroups.map(({ id }) => {
      const object = prepared.scene.getObjectByName(id);
      if (!object) throw new Error(`Grupo ausente: ${id}`);
      return { id, object, home: object.position.clone(), visible: true };
    });
  }, [asset.id, prepared]);
  useFrame((_, delta) => {
    groups.forEach((group) => {
      const visible = installed.includes(group.id);
      if (visible && !group.visible) group.object.position.y += 1.5 / prepared.scale;
      group.visible = visible;
      group.object.visible = visible;
      group.object.position.lerp(group.home, 1 - Math.exp(-10 * delta));
    });
  });
  useEffect(
    () => () => {
      prepared.materials.forEach(({ material }) => material.dispose());
    },
    [prepared],
  );
  useLayoutEffect(() => {
    prepared.windows.forEach((window) => {
      window.visible = windowVisible;
    });
    prepared.materials.forEach(({ material, original }) => {
      material.copy(original);
      if (!readable || asset.id !== 'case') return;
      if (material.name === 'Plastics') {
        material.color.set('#788392');
        material.metalness = 0.2;
        material.roughness = 0.65;
      }
      if (material.name === 'material') material.emissiveIntensity = 0.7;
      if (material.name === 'Window') {
        material.opacity = 0.22;
        material.depthWrite = false;
      }
    });
  }, [asset.id, prepared, readable, windowVisible]);
  return (
    <group scale={prepared.scale} position={prepared.position}>
      <primitive object={prepared.scene} />
    </group>
  );
}

export default function ReceivedCaseViewer({ onReturn }: { onReturn: () => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const matchingModels = assemblyLibrary.filter(
    (model) =>
      (category === 'Todos' || modelCategory(model) === category) &&
      searchable(`${model.name} ${model.author} ${model.note}`).includes(searchable(search.trim())),
  );
  const [assetId, setAssetId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('model');
    return receivedModels.some((model) => model.id === requested) ? requested! : 'corsair';
  });
  const receivedCase = receivedModels.find((model) => model.id === assetId)!;
  const [installed, setInstalled] = useState<BoardGroup[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('undc-board-v1') ?? 'null');
      if (
        Array.isArray(saved) &&
        saved.every((id) => boardGroups.some((group) => group.id === id)) &&
        new Set(saved).size === saved.length &&
        (saved.length === 0 || saved.includes('MotherBoard'))
      )
        return saved;
    } catch {
      /* El almacenamiento puede no estar disponible. */
    }
    return boardGroups.map(({ id }) => id);
  });
  const [selected, setSelected] = useState<BoardGroup>('CPU');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [message, setMessage] = useState('Selecciona un modelo para explorarlo.');
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    try {
      localStorage.setItem('undc-board-v1', JSON.stringify(installed));
    } catch {
      setMessage('No se pudo guardar esta práctica; puedes continuar.');
    }
  }, [installed]);
  function change(install: boolean) {
    if (lock.current) return;
    const result = changeBoardGroup(installed, selected, install);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (!result.installed) return;
    setInstalled(result.installed);
    setMessage(`${selected}: ${install ? 'instalado' : 'retirado'}.`);
    lock.current = true;
    setBusy(true);
    timer.current = setTimeout(() => {
      lock.current = false;
      setBusy(false);
    }, 850);
  }
  const [windowVisible, setWindowVisible] = useState(true);
  const [readable, setReadable] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [camera, setCamera] = useState<CameraCommand>({
    action: 'reset',
    sequence: 0,
    target: [0, 0, 0],
  });
  function control(action: CameraCommand['action']) {
    setCamera((previous) => ({ action, sequence: previous.sequence + 1, target: [0, 0, 0] }));
  }
  function retry() {
    useGLTF.clear(receivedCase.modelPath);
    setAttempt((value) => value + 1);
  }
  return (
    <section className="received-case">
      <SimulatorHeader
        title="Explorar modelos"
        eyebrow={`Biblioteca educativa · ${assemblyLibrary.length} modelos`}
        description="Busca una pieza, examínala en 3D y consulta su autoría y licencia."
        actions={
          <button className="button ghost" onClick={onReturn}>
            Volver al inicio
          </button>
        }
      />
      <div className="model-filters">
        <label>
          Buscar modelo o autor
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej.: memoria, laptop, monitor…"
            aria-controls="model-results"
          />
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-controls="model-results"
          >
            {['Todos', 'Componentes', 'Gabinetes', 'Periféricos', 'Laptop'].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <p role="status">
          {matchingModels.length} de {assemblyLibrary.length} modelos
        </p>
      </div>
      <div
        className="model-results"
        id="model-results"
        role="group"
        aria-label="Modelos disponibles"
      >
        {matchingModels.map((model) => (
          <button
            key={model.id}
            className="button model-chip"
            disabled={busy}
            aria-pressed={assetId === model.id}
            onClick={() => {
              setAssetId(model.id);
              control('reset');
            }}
          >
            {model.name}
          </button>
        ))}
        {!matchingModels.length && (
          <div className="model-empty">
            <p>No hay modelos con estos filtros. El visor conserva tu selección.</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch('');
                setCategory('Todos');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
      <div className="received-layout">
        <section className="viewer" aria-label="Visor de modelos recibidos">
          <div className="viewer-heading">
            <span>{receivedCase.name}</span>
            <span>Vista 3D</span>
          </div>
          <div className="canvas-container">
            <ErrorBoundary
              key={`${assetId}-${attempt}`}
              fallback={
                <div className="scene-fallback" role="alert">
                  No se pudo abrir el visor o cargar el archivo. Comprueba WebGL y la conexión
                  local.
                  <p>
                    <button className="button" onClick={retry}>
                      Reintentar carga
                    </button>
                  </p>
                  <button className="button" onClick={onReturn}>
                    Volver al inicio
                  </button>
                </div>
              }
            >
              <Canvas
                dpr={[1, 1.5]}
                camera={{ position: initialCamera, fov: 43 }}
                gl={{
                  antialias: true,
                  toneMapping: ACESFilmicToneMapping,
                  toneMappingExposure: 1.15,
                }}
                fallback={
                  <div className="scene-fallback">
                    El navegador no permite WebGL. Activa la aceleración de hardware.
                  </div>
                }
              >
                <Lighting />
                <Suspense
                  fallback={
                    <Html center>
                      <Global3DLoader variant="library" compact />
                    </Html>
                  }
                >
                  <ReceivedModel
                    asset={receivedCase}
                    installed={installed}
                    windowVisible={windowVisible}
                    readable={readable}
                  />
                </Suspense>
                <CameraRig command={camera} />
              </Canvas>
            </ErrorBoundary>
          </div>
          <div className="viewer-toolbar">
            <CameraToolbar onAction={control} />
            {assetId === 'case' && (
              <div className="scene-options">
                <label>
                  <input
                    type="checkbox"
                    checked={windowVisible}
                    onChange={(event) => setWindowVisible(event.target.checked)}
                  />{' '}
                  Mostrar ventana
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={readable}
                    onChange={(event) => setReadable(event.target.checked)}
                  />{' '}
                  Materiales más claros
                </label>
              </div>
            )}
            <p>Arrastra para girar · Usa la rueda o los botones para acercar.</p>
          </div>
        </section>
        <aside className="panel received-details">
          <h2>{receivedCase.name}</h2>
          <p>{receivedCase.note}</p>
          {assetId === 'motherboard' && (
            <>
              <h3>Práctica sobre la placa</h3>
              <p>Retira las piezas y vuelve a instalarlas en sus posiciones originales.</p>
              <label htmlFor="board-group">Pieza</label>
              <select
                id="board-group"
                value={selected}
                disabled={busy}
                onChange={(event) => setSelected(event.target.value as BoardGroup)}
              >
                {boardGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} · {installed.includes(group.id) ? 'Instalada' : 'Retirada'}
                  </option>
                ))}
              </select>
              <p>{boardGroups.find(({ id }) => id === selected)!.description}</p>
              <div className="camera-buttons">
                <button className="button primary" disabled={busy} onClick={() => change(true)}>
                  Instalar
                </button>
                <button className="button" disabled={busy} onClick={() => change(false)}>
                  Retirar
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    setInstalled([]);
                    setMessage('Mesa vacía. Instala primero la placa madre.');
                  }}
                >
                  Reiniciar práctica
                </button>
              </div>
              <p>
                {installed.length}/{boardGroups.length} grupos instalados
              </p>
              <progress
                value={installed.length}
                max={boardGroups.length}
                aria-label="Progreso de la placa"
              />
              <p>
                Esta práctica no incluye alimentación ni encendido. El montaje completo está en
                «Ensamblar PC».
              </p>
            </>
          )}
          <p role="status">{message}</p>
          <h3>Autor y licencia</h3>
          <p>
            <a href={receivedCase.source} target="_blank" rel="noreferrer">
              {receivedCase.name}
            </a>{' '}
            de {receivedCase.author}, bajo{' '}
            <a
              href={receivedCase.licenseUrl ?? 'https://creativecommons.org/licenses/by/4.0/'}
              target="_blank"
              rel="noreferrer"
            >
              {receivedCase.license ?? 'CC BY 4.0'}
            </a>
            .
          </p>
          <p className="small muted">
            Archivos originales conservados. La escala uniforme de exhibición no comprueba
            compatibilidad física.
          </p>
        </aside>
      </div>
    </section>
  );
}
