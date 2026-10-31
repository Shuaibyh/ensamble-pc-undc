import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { SimulatorHeader } from '../../components/ui/SimulatorHeader';
import {
  guidedPieceById,
  guidedPieces,
  type GuidedKind,
  type GuidedPieceId,
} from '../../data/guidedAssembly';
import {
  GuidedAssemblyScene,
  type GuidedCameraAction,
  type GuidedCameraCommand,
  type GuidedCameraMode,
  type GuidedInventoryPointer,
  type GuidedScrewSelection,
} from '../../scene/GuidedAssemblyScene';
import './guidedAssembly.css';

type PieceMap<T> = Record<GuidedPieceId, T>;
const allIds: GuidedPieceId[] = ['pc-board', 'pc-ram', 'pc-gpu', 'laptop-ram', 'laptop-ssd'];
const mapOf = <T,>(value: (id: GuidedPieceId) => T) =>
  Object.fromEntries(allIds.map((id) => [id, value(id)])) as PieceMap<T>;

export function GuidedAssemblyWorkspace({
  kind,
  onClassic,
  onReturn,
}: {
  kind: GuidedKind;
  onClassic: () => void;
  onReturn: () => void;
}) {
  const pieces = guidedPieces[kind];
  const dropRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<GuidedPieceId>(pieces[0].id);
  const [loose, setLoose] = useState<GuidedPieceId[]>([]);
  const [inserted, setInserted] = useState<GuidedPieceId[]>([]);
  const [screws, setScrews] = useState<PieceMap<boolean[]>>(() =>
    mapOf((id) =>
      Array(guidedPieceById(id.startsWith('pc-') ? 'pc' : 'laptop', id)?.screws ?? 0).fill(false),
    ),
  );
  const [aligned, setAligned] = useState<PieceMap<boolean>>(() => mapOf(() => false));
  const [rotations, setRotations] = useState<PieceMap<number>>(() => mapOf(() => 0));
  const [positionReset, setPositionReset] = useState<PieceMap<number>>(() => mapOf(() => 0));
  const [inserting, setInserting] = useState<GuidedPieceId | null>(null);
  const [screwBusy, setScrewBusy] = useState<GuidedScrewSelection | null>(null);
  const [inventoryPointer, setInventoryPointer] = useState<GuidedInventoryPointer | null>(null);
  const [cameraMode, setCameraMode] = useState<GuidedCameraMode>('guided');
  const [cameraCommand, setCameraCommand] = useState<GuidedCameraCommand>({
    action: kind === 'pc' ? 'front' : 'top',
    sequence: 0,
  });
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState(
    'Mantén pulsada una tarjeta y arrástrala al área 3D para comenzar.',
  );
  const definition = guidedPieceById(kind, selected);
  const busy = !!inserting || !!screwBusy;
  const complete = (id: GuidedPieceId) => {
    const item = guidedPieceById(kind, id);
    return inserted.includes(id) && (!item.screws || screws[id].every(Boolean));
  };
  const completed = pieces.filter((piece) => complete(piece.id)).length;
  const totalScrews = pieces.reduce((total, piece) => total + piece.screws, 0);
  const fixedScrews = pieces.reduce(
    (total, piece) => total + screws[piece.id].filter(Boolean).length,
    0,
  );

  function camera(action: GuidedCameraAction, id = selected) {
    setCameraCommand((previous) => ({
      action,
      target:
        action === 'focus' || action === 'screw' ? guidedPieceById(kind, id).focus : undefined,
      sequence: previous.sequence + 1,
    }));
    if (action === 'focus' || action === 'screw')
      setMessage(`${guidedPieceById(kind, id).name}: cámara guiada activa.`);
  }

  function unlocked(id: GuidedPieceId) {
    return guidedPieceById(kind, id).dependencies.every(complete);
  }

  useEffect(() => {
    const draggedId = inventoryPointer?.id;
    if (!draggedId) return;
    const activeId = draggedId;
    document.body.classList.add('guided-inventory-dragging');
    const inside = (clientX: number, clientY: number) => {
      const rect = dropRef.current?.getBoundingClientRect();
      return (
        !!rect &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    };
    function move(event: PointerEvent) {
      setInventoryPointer({
        id: activeId,
        clientX: event.clientX,
        clientY: event.clientY,
        inside: inside(event.clientX, event.clientY),
      });
    }
    function up(event: PointerEvent) {
      if (inside(event.clientX, event.clientY)) {
        setLoose((current) => (current.includes(activeId) ? current : [...current, activeId]));
        setSelected(activeId);
        setMessage(
          'Pieza recibida. Muévela al contorno azul, ajusta su orientación y pulsa Insertar.',
        );
        setCameraCommand((previous) => ({
          action: 'focus',
          target: guidedPieceById(kind, activeId).focus,
          sequence: previous.sequence + 1,
        }));
      } else {
        setMessage('Arrastre cancelado: suelta la pieza dentro del visor central.');
      }
      setInventoryPointer(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      document.body.classList.remove('guided-inventory-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [inventoryPointer?.id, kind]);

  function beginInventoryDrag(event: ReactPointerEvent<HTMLButtonElement>, id: GuidedPieceId) {
    if (busy || loose.includes(id) || inserted.includes(id)) return;
    if (!unlocked(id)) {
      setSelected(id);
      setMessage(
        `Completa primero: ${guidedPieceById(kind, id)
          .dependencies.map((dependency) => guidedPieceById(kind, dependency).name)
          .join(', ')}.`,
      );
      return;
    }
    event.preventDefault();
    setSelected(id);
    setInventoryPointer({ id, clientX: event.clientX, clientY: event.clientY, inside: false });
    setMessage('Arrastra la tarjeta hacia el visor. Soltar fuera cancela sin instalarla.');
  }

  function rotate(direction: -1 | 1) {
    if (!loose.includes(selected) || inserted.includes(selected) || busy) return;
    setRotations((current) => ({
      ...current,
      [selected]: (current[selected] + (direction > 0 ? 1 : 3)) % 4,
    }));
    setAligned((current) => ({ ...current, [selected]: false }));
    setMessage('Orientación modificada. Vuelve a alinear la pieza con el destino.');
  }
  function resetPosition() {
    if (!loose.includes(selected) || inserted.includes(selected) || busy) return;
    setPositionReset((current) => ({ ...current, [selected]: current[selected] + 1 }));
    setRotations((current) => ({ ...current, [selected]: 0 }));
    setAligned((current) => ({ ...current, [selected]: false }));
    setMessage('Pieza devuelta a la bandeja 3D.');
  }
  function cancel() {
    if (!loose.includes(selected) || inserted.includes(selected) || busy) return;
    setLoose((current) => current.filter((id) => id !== selected));
    setAligned((current) => ({ ...current, [selected]: false }));
    setRotations((current) => ({ ...current, [selected]: 0 }));
    setMessage(`${definition.name} volvió al inventario.`);
  }
  function insert() {
    if (!aligned[selected] || !loose.includes(selected) || inserted.includes(selected) || busy)
      return;
    setInserting(selected);
    setMessage(`${definition.name}: insertando en su posición real…`);
  }
  function finishInsertion(id: GuidedPieceId) {
    setInserted((current) => (current.includes(id) ? current : [...current, id]));
    setInserting(null);
    const item = guidedPieceById(kind, id);
    setMessage(
      item.screws
        ? `${item.name} insertada. Arrastra los tornillos numerados hasta los objetivos azules.`
        : `${item.name}: instalación completada.`,
    );
    setCameraCommand((previous) => ({
      action: item.screws ? 'screw' : 'focus',
      target: item.focus,
      sequence: previous.sequence + 1,
    }));
  }
  function beginScrew(piece: GuidedPieceId, index: number) {
    if (screwBusy || screws[piece][index]) return;
    setSelected(piece);
    setScrewBusy({ piece, index });
    setMessage(`Tornillo ${index + 1}: aplicando giro y avance visual.`);
  }
  function finishScrew(piece: GuidedPieceId, index: number) {
    const updated = screws[piece].map((value, itemIndex) => (itemIndex === index ? true : value));
    setScrews((current) => ({ ...current, [piece]: updated }));
    setScrewBusy(null);
    const next = updated.findIndex((value) => !value);
    setMessage(
      next >= 0
        ? `Tornillo ${index + 1} colocado. Continúa con el tornillo ${next + 1}.`
        : `${guidedPieceById(kind, piece).name}: fijación completada.`,
    );
  }
  function reset() {
    setSelected(pieces[0].id);
    setLoose([]);
    setInserted([]);
    setScrews(
      mapOf((id) =>
        Array(guidedPieceById(id.startsWith('pc-') ? 'pc' : 'laptop', id)?.screws ?? 0).fill(false),
      ),
    );
    setAligned(mapOf(() => false));
    setRotations(mapOf(() => 0));
    setPositionReset(mapOf(() => 0));
    setInserting(null);
    setScrewBusy(null);
    setInventoryPointer(null);
    setCameraMode('guided');
    setResetKey((value) => value + 1);
    setMessage('Etapa reiniciada. Arrastra una tarjeta desde el inventario.');
  }

  const stateLabel = (() => {
    if (complete(selected)) return 'Atornillado / completado';
    if (inserted.includes(selected))
      return `Insertado · tornillos ${screws[selected].filter(Boolean).length}/${definition.screws}`;
    if (aligned[selected]) return 'Alineado';
    if (loose.includes(selected)) return 'En manipulación';
    return unlocked(selected) ? 'Disponible' : 'Requiere paso previo';
  })();

  return (
    <section className="guided-assembly">
      <SimulatorHeader
        title={kind === 'pc' ? 'Ensamblar PC' : 'Ensamblar laptop'}
        eyebrow="Modo de ensamblaje interactivo · demostración guiada"
        description="Arrastra componentes reales, oriéntalos, insértalos y completa sus fijaciones."
        actions={
          <>
            <button className="button ghost danger" disabled={busy} onClick={reset}>
              Reiniciar etapa
            </button>
            <button className="button secondary" disabled={busy} onClick={onClassic}>
              Modo clásico
            </button>
            <button className="button ghost" onClick={onReturn}>
              Volver al inicio
            </button>
          </>
        }
      />
      <div className="guided-mode-note" role="status">
        <strong>Interactivo</strong>
        <span>El progreso de esta demostración es independiente del modo clásico.</span>
      </div>
      <main className="workspace guided-layout">
        <aside className="panel guided-inventory">
          <div className="panel-heading">
            <h2>Inventario</h2>
            <span>
              {completed}/{pieces.length}
            </span>
          </div>
          <p className="guided-help">Mantén pulsada una tarjeta y arrástrala al visor.</p>
          <div className="catalog-list">
            {pieces.map((piece) => {
              const done = complete(piece.id);
              const inScene = loose.includes(piece.id);
              const blocked = !unlocked(piece.id);
              return (
                <button
                  key={piece.id}
                  className={`part-card guided-card ${selected === piece.id ? 'selected' : ''}`}
                  aria-pressed={selected === piece.id}
                  disabled={busy}
                  onPointerDown={(event) => beginInventoryDrag(event, piece.id)}
                  onClick={() => {
                    setSelected(piece.id);
                    if (inScene || inserted.includes(piece.id)) camera('focus', piece.id);
                  }}
                >
                  <span className="guided-card-icon" aria-hidden="true">
                    {piece.id.includes('ram')
                      ? '▥'
                      : piece.id.includes('gpu')
                        ? '▰'
                        : piece.id.includes('ssd')
                          ? '▱'
                          : '▦'}
                  </span>
                  <span>
                    <strong>{piece.name}</strong>
                    <small>{piece.short}</small>
                    <span className={`badge ${done ? 'success' : blocked ? 'blocked' : ''}`}>
                      {done
                        ? '✓ Completado'
                        : inScene
                          ? 'En manipulación'
                          : blocked
                            ? 'Requiere paso previo'
                            : 'Arrastrar al centro'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="catalog-note">
            <strong>Progreso</strong>
            <progress value={completed} max={pieces.length} />
            <small>
              {completed}/{pieces.length} piezas · {fixedScrews}/{totalScrews} tornillos
            </small>
          </div>
        </aside>
        <section
          className="viewer guided-viewer"
          aria-label={`Ensamblaje interactivo de ${kind === 'pc' ? 'PC' : 'laptop'}`}
        >
          <div className="viewer-heading">
            <span>
              <i /> Área de ensamblaje interactivo
            </span>
            <span>
              {completed}/{pieces.length} piezas · {fixedScrews}/{totalScrews} tornillos
            </span>
          </div>
          <div className="canvas-container guided-canvas" ref={dropRef}>
            <ErrorBoundary
              fallback={
                <div className="scene-fallback" role="alert">
                  No se pudo cargar la escena interactiva. Usa Modo clásico como respaldo.
                </div>
              }
            >
              <GuidedAssemblyScene
                key={resetKey}
                kind={kind}
                selected={selected}
                loose={loose}
                inserted={inserted}
                screws={screws}
                rotations={rotations}
                positionReset={positionReset}
                inserting={inserting}
                screwBusy={screwBusy}
                inventoryPointer={inventoryPointer}
                cameraMode={cameraMode}
                cameraCommand={cameraCommand}
                onSelect={setSelected}
                onPlacement={(id, correct, text) => {
                  setSelected(id);
                  setAligned((current) => ({ ...current, [id]: correct }));
                  setMessage(text);
                }}
                onInsertionComplete={finishInsertion}
                onScrew={beginScrew}
                onScrewRejected={(piece, index) => {
                  setSelected(piece);
                  setMessage(
                    `El tornillo ${index + 1} no coincide con el objetivo. Acércalo al aro azul.`,
                  );
                }}
                onScrewComplete={finishScrew}
              />
            </ErrorBoundary>
            <div className="guided-camera-bar" role="group" aria-label="Cámara educativa">
              <button
                className="guided-tool"
                aria-pressed={cameraMode === 'guided'}
                title="Cámara guiada"
                onClick={() => {
                  setCameraMode('guided');
                  camera('focus');
                }}
              >
                ◎<span>Guiada</span>
              </button>
              <button
                className="guided-tool"
                aria-pressed={cameraMode === 'free'}
                title="Cámara libre"
                onClick={() => setCameraMode('free')}
              >
                ✥<span>Libre</span>
              </button>
              <button
                className="guided-tool"
                title="Vista frontal"
                onClick={() => {
                  setCameraMode('guided');
                  camera('front');
                }}
              >
                ▣<span>Frontal</span>
              </button>
              <button
                className="guided-tool"
                title="Vista superior"
                onClick={() => {
                  setCameraMode('guided');
                  camera('top');
                }}
              >
                ⬒<span>Superior</span>
              </button>
              <button
                className="guided-tool"
                title="Restablecer cámara"
                onClick={() => {
                  setCameraMode('guided');
                  camera('home');
                }}
              >
                ⌂<span>Restablecer</span>
              </button>
            </div>
            {loose.includes(selected) && !inserted.includes(selected) && (
              <div
                className="guided-piece-toolbar"
                role="toolbar"
                aria-label={`Controles de ${definition.name}`}
              >
                <button
                  className="guided-tool"
                  title="Girar a la izquierda"
                  disabled={busy}
                  onClick={() => rotate(-1)}
                >
                  ↶<span>Izquierda</span>
                </button>
                <button
                  className="guided-tool"
                  title="Girar a la derecha"
                  disabled={busy}
                  onClick={() => rotate(1)}
                >
                  ↷<span>Derecha</span>
                </button>
                <button
                  className="guided-tool guided-primary"
                  title="Insertar pieza"
                  disabled={!aligned[selected] || busy}
                  onClick={insert}
                >
                  ⤓<span>Insertar</span>
                </button>
                <button
                  className="guided-tool"
                  title="Reiniciar posición"
                  disabled={busy}
                  onClick={resetPosition}
                >
                  ↺<span>Posición</span>
                </button>
                <button
                  className="guided-tool guided-danger"
                  title="Devolver al inventario"
                  disabled={busy}
                  onClick={cancel}
                >
                  ✕<span>Cancelar</span>
                </button>
              </div>
            )}
          </div>
        </section>
        <aside className="panel guided-details">
          <div className="panel-heading">
            <h2>Guía del paso</h2>
            <span>Interactivo</span>
          </div>
          <div className="details-content">
            <span className="eyebrow">Pieza seleccionada</span>
            <h2>{definition.name}</h2>
            <p className="detail-spec">{definition.short}</p>
            <span className={`guided-state ${complete(selected) ? 'complete' : ''}`}>
              {stateLabel}
            </span>
            <h3>Objetivo</h3>
            <p>{definition.purpose}</p>
            <h3>Acción actual</h3>
            <p className="guided-message" role="status" aria-live="polite">
              {message}
            </p>
            {definition.screws > 0 && inserted.includes(selected) && (
              <div className="guided-screw-panel">
                <strong>
                  Fijaciones {screws[selected].filter(Boolean).length}/{definition.screws}
                </strong>
                <div className="guided-screw-grid">
                  {screws[selected].map((fixed, index) => (
                    <span key={index} className={fixed ? 'fixed' : ''}>
                      Tornillo {index + 1} {fixed ? '✓' : '○'}
                    </span>
                  ))}
                </div>
                <small>
                  Simulación educativa basada en los puntos del modelo; no certifica medidas
                  físicas.
                </small>
              </div>
            )}
            <div className="guided-steps">
              <strong>Secuencia</strong>
              <ol>
                <li>Arrastra desde el inventario.</li>
                <li>Mueve y gira hasta alinear.</li>
                <li>Pulsa Insertar.</li>
                <li>Arrastra cada tornillo si corresponde.</li>
              </ol>
            </div>
          </div>
        </aside>
      </main>
      {inventoryPointer && (
        <div
          className="guided-inventory-ghost"
          style={{ left: inventoryPointer.clientX + 14, top: inventoryPointer.clientY + 14 }}
        >
          <span>✥</span>
          {guidedPieceById(kind, inventoryPointer.id).name}
        </div>
      )}
    </section>
  );
}
