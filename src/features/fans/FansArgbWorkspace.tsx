import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { SimulatorHeader } from '../../components/ui/SimulatorHeader';
import { emptyScrews, fanDefinitions, screwOffsets, type FanId } from '../../data/fansArgb';
import {
  FansArgbScene,
  type FanCameraAction,
  type FanCameraCommand,
  type FanCameraMode,
  type FanPreviewMode,
  type InventoryPointer,
  type ScrewSelection,
} from '../../scene/FansArgbScene';
import './fans.css';

const emptyAlignment = (): Record<FanId, boolean> => ({ fan1: false, fan2: false, fan3: false });
const emptyRotations = (): Record<FanId, number> => ({ fan1: 0, fan2: 0, fan3: 0 });
const emptyPositionReset = (): Record<FanId, number> => ({ fan1: 0, fan2: 0, fan3: 0 });

export function FansArgbWorkspace({ onReturn }: { onReturn: () => void }) {
  const canvasDropRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<FanId>('fan1');
  const [loose, setLoose] = useState<FanId[]>([]);
  const [installed, setInstalled] = useState<FanId[]>([]);
  const [screws, setScrews] = useState(emptyScrews);
  const [aligned, setAligned] = useState(emptyAlignment);
  const [rotations, setRotations] = useState(emptyRotations);
  const [positionReset, setPositionReset] = useState(emptyPositionReset);
  const [inserting, setInserting] = useState<FanId | null>(null);
  const [screwBusy, setScrewBusy] = useState<ScrewSelection | null>(null);
  const [inventoryPointer, setInventoryPointer] = useState<InventoryPointer | null>(null);
  const [message, setMessage] = useState(
    'Arrastra un ventilador desde la tarjeta del inventario hasta el visor 3D.',
  );
  const [previewMode, setPreviewMode] = useState<FanPreviewMode>('off');
  const [fixedColor, setFixedColor] = useState('#39d5ff');
  const [spinPreview, setSpinPreview] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [cameraMode, setCameraMode] = useState<FanCameraMode>('guided');
  const [cameraCommand, setCameraCommand] = useState<FanCameraCommand>({
    action: 'front',
    sequence: 0,
  });
  const selectedFan = fanDefinitions.find((fan) => fan.id === selected)!;
  const screwCount = (id: FanId) => screws[id].filter(Boolean).length;
  const totalScrews = fanDefinitions.reduce((total, fan) => total + screwCount(fan.id), 0);
  const busy = !!inserting || !!screwBusy;
  const draggedId = inventoryPointer?.id;

  function camera(action: FanCameraAction, target?: readonly [number, number, number]) {
    setCameraCommand((previous) => ({ action, target, sequence: previous.sequence + 1 }));
  }

  function fanTarget(id: FanId) {
    return fanDefinitions.find((fan) => fan.id === id)!.target;
  }

  function screwTarget(id: FanId, index: number): readonly [number, number, number] {
    const target = fanTarget(id);
    const offset = screwOffsets[index];
    return [target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]];
  }

  useEffect(() => {
    if (!draggedId) return;
    const activeId = draggedId;
    document.body.classList.add('fan-inventory-dragging');
    function insideCanvas(clientX: number, clientY: number) {
      const rect = canvasDropRef.current?.getBoundingClientRect();
      return (
        !!rect &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    }
    function move(event: PointerEvent) {
      setInventoryPointer({
        id: activeId,
        clientX: event.clientX,
        clientY: event.clientY,
        inside: insideCanvas(event.clientX, event.clientY),
      });
    }
    function up(event: PointerEvent) {
      const accepted = insideCanvas(event.clientX, event.clientY);
      if (accepted) {
        setLoose((current) => (current.includes(activeId) ? current : [...current, activeId]));
        setSelected(activeId);
        setAligned((current) => ({ ...current, [activeId]: false }));
        setMessage(
          'Pieza recibida en el visor. Muévela hasta el soporte iluminado y ajusta su orientación.',
        );
        if (cameraMode === 'guided') camera('focus', fanTarget(activeId));
      } else {
        setMessage('Arrastre cancelado: suelta la pieza dentro del área central de ensamblaje.');
      }
      setInventoryPointer(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      document.body.classList.remove('fan-inventory-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [cameraMode, draggedId]);

  function startInventoryDrag(event: ReactPointerEvent<HTMLButtonElement>, id: FanId) {
    if (busy || loose.includes(id) || installed.includes(id)) return;
    event.preventDefault();
    setSelected(id);
    setInventoryPointer({ id, clientX: event.clientX, clientY: event.clientY, inside: false });
    setMessage('Arrastra la tarjeta hacia el visor central. Soltar fuera cancelará la acción.');
  }

  function rotateSelected(direction: -1 | 1) {
    if (!loose.includes(selected) || installed.includes(selected) || busy) return;
    setRotations((previous) => ({
      ...previous,
      [selected]: (previous[selected] + (direction === 1 ? 1 : 3)) % 4,
    }));
    setAligned((previous) => ({ ...previous, [selected]: false }));
    setMessage('Orientación modificada. Vuelve a comprobar la posición antes de insertar.');
  }

  function resetSelectedPosition() {
    if (!loose.includes(selected) || installed.includes(selected) || busy) return;
    setPositionReset((previous) => ({ ...previous, [selected]: previous[selected] + 1 }));
    setRotations((previous) => ({ ...previous, [selected]: 0 }));
    setAligned((previous) => ({ ...previous, [selected]: false }));
    setMessage('La pieza volvió a la bandeja 3D. Acércala nuevamente al soporte.');
    if (cameraMode === 'guided') camera('focus', fanTarget(selected));
  }

  function cancelSelected() {
    if (!loose.includes(selected) || installed.includes(selected) || busy) return;
    setLoose((current) => current.filter((id) => id !== selected));
    setAligned((current) => ({ ...current, [selected]: false }));
    setRotations((current) => ({ ...current, [selected]: 0 }));
    setMessage(`${selectedFan.name} devuelto al inventario.`);
    if (cameraMode === 'guided') camera('front');
  }

  function insertSelected() {
    if (!aligned[selected] || !loose.includes(selected) || installed.includes(selected) || busy)
      return;
    setInserting(selected);
    setMessage(`${selectedFan.name}: insertando con una animación guiada...`);
  }

  function finishInsertion(id: FanId) {
    setInstalled((current) => (current.includes(id) ? current : [...current, id]));
    setAligned((current) => ({ ...current, [id]: false }));
    setInserting(null);
    setMessage(
      `${fanDefinitions.find((fan) => fan.id === id)!.name} instalado. Arrastra cada tornillo numerado hasta su agujero.`,
    );
    if (cameraMode === 'guided') camera('screw', screwTarget(id, 0));
  }

  function beginScrew(fan: FanId, index: number) {
    if (screwBusy || !installed.includes(fan) || screws[fan][index]) return;
    setSelected(fan);
    setScrewBusy({ fan, index });
    setMessage(`Tornillo ${index + 1} alineado: aplicando giro y avance.`);
  }

  function finishScrew(fan: FanId, index: number) {
    const updated = screws[fan].map((value, itemIndex) => (itemIndex === index ? true : value));
    setScrews((current) => ({ ...current, [fan]: updated }));
    setScrewBusy(null);
    const next = updated.findIndex((value) => !value);
    setMessage(
      next >= 0
        ? `Tornillo ${index + 1} colocado. Continúa con el tornillo ${next + 1}.`
        : `${fanDefinitions.find((item) => item.id === fan)!.name}: fijación 4/4 completada.`,
    );
    if (cameraMode === 'guided')
      camera(next >= 0 ? 'screw' : 'focus', next >= 0 ? screwTarget(fan, next) : fanTarget(fan));
  }

  function reset() {
    setSelected('fan1');
    setLoose([]);
    setInstalled([]);
    setScrews(emptyScrews());
    setAligned(emptyAlignment());
    setRotations(emptyRotations());
    setPositionReset(emptyPositionReset());
    setInserting(null);
    setScrewBusy(null);
    setInventoryPointer(null);
    setPreviewMode('off');
    setSpinPreview(false);
    setCameraMode('guided');
    setResetToken((value) => value + 1);
    setMessage('Etapa reiniciada. Arrastra un ventilador desde el inventario al visor.');
    camera('front');
  }

  return (
    <section className="fans-beta">
      <SimulatorHeader
        title="Ventiladores ARGB (Beta)"
        eyebrow="Módulo independiente · montaje frontal provisional"
        description="Arrastra, orienta, inserta y fija tres ventiladores con doce tornillos."
        actions={
          <>
            <button className="button ghost danger" disabled={busy} onClick={reset}>
              Reiniciar etapa
            </button>
            <button className="button ghost" onClick={onReturn}>
              Volver al simulador PC original
            </button>
          </>
        }
      />
      <main className="workspace fans-layout">
        <aside className="panel fans-inventory">
          <div className="panel-heading">
            <h2>Inventario</h2>
            <span>{installed.length}/3</span>
          </div>
          <div className="catalog-content">
            <p className="small muted">Mantén pulsada una tarjeta y arrástrala al visor.</p>
            <div className="catalog-list">
              {fanDefinitions.map((fan) => {
                const inScene = loose.includes(fan.id);
                const complete = installed.includes(fan.id);
                return (
                  <button
                    key={fan.id}
                    className={`part-card fan-inventory-card ${selected === fan.id ? 'selected' : ''}`}
                    onPointerDown={(event) => startInventoryDrag(event, fan.id)}
                    onClick={() => {
                      setSelected(fan.id);
                      if (cameraMode === 'guided' && (inScene || complete))
                        camera('focus', fan.target);
                    }}
                  >
                    <span className="fan-card-icon" aria-hidden="true">
                      ✣
                    </span>
                    <span>
                      <strong>{fan.name}</strong>
                      <small>
                        {complete
                          ? 'Instalado en el frontal'
                          : inScene
                            ? 'Suelto en el área 3D'
                            : 'Disponible para arrastrar'}
                      </small>
                      <span className={`badge ${complete ? 'success' : ''}`}>
                        {complete
                          ? `✓ Tornillos ${screwCount(fan.id)}/4`
                          : inScene
                            ? 'Manipular en el visor'
                            : 'Arrastrar al centro'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="catalog-note">
              <strong>Progreso de fijaciones</strong>
              <progress value={totalScrews} max={12} />
              <small>{totalScrews}/12 tornillos · agujeros de 105 mm provisionales.</small>
            </div>
          </div>
        </aside>
        <section className="viewer fans-viewer" aria-label="Simulador 3D de ventiladores ARGB">
          <div className="viewer-heading">
            <span>
              <i /> Área de montaje frontal
            </span>
            <span>
              {installed.length}/3 ventiladores · {totalScrews}/12 tornillos
            </span>
          </div>
          <div className="canvas-container fans-canvas" ref={canvasDropRef}>
            <ErrorBoundary
              fallback={
                <div className="scene-fallback" role="alert">
                  No se pudieron cargar los GLB. Verifica{' '}
                  <strong>public/models/fans-argb-beta/</strong> y recarga.
                </div>
              }
            >
              <FansArgbScene
                key={resetToken}
                selected={selected}
                loose={loose}
                installed={installed}
                screws={screws}
                rotations={rotations}
                positionReset={positionReset}
                inserting={inserting}
                screwBusy={screwBusy}
                previewMode={previewMode}
                fixedColor={fixedColor}
                spinPreview={spinPreview}
                resetToken={resetToken}
                cameraMode={cameraMode}
                cameraCommand={cameraCommand}
                inventoryPointer={inventoryPointer}
                onSelect={setSelected}
                onPlacement={(id, correct, correction) => {
                  setSelected(id);
                  setAligned((current) => ({ ...current, [id]: correct }));
                  setMessage(correction);
                }}
                onInsertionComplete={finishInsertion}
                onScrew={beginScrew}
                onScrewRejected={(fan, index) => {
                  setSelected(fan);
                  setMessage(
                    `El tornillo ${index + 1} no coincide con el agujero marcado. Acércalo al aro azul.`,
                  );
                }}
                onScrewComplete={finishScrew}
              />
            </ErrorBoundary>
            <div className="fan-camera-bar" role="group" aria-label="Cámara educativa">
              <button
                className="fan-tool"
                aria-pressed={cameraMode === 'guided'}
                title="Cámara guiada"
                onClick={() => {
                  setCameraMode('guided');
                  camera('focus', fanTarget(selected));
                }}
              >
                ◎<span>Guiada</span>
              </button>
              <button
                className="fan-tool"
                aria-pressed={cameraMode === 'free'}
                title="Cámara libre"
                onClick={() => setCameraMode('free')}
              >
                ✥<span>Libre</span>
              </button>
              <button
                className="fan-tool"
                title="Vista frontal oblicua"
                onClick={() => {
                  setCameraMode('guided');
                  camera('front');
                }}
              >
                ▣<span>Frontal</span>
              </button>
              <button
                className="fan-tool"
                title="Vista lateral"
                onClick={() => {
                  setCameraMode('guided');
                  camera('lateral');
                }}
              >
                ◧<span>Lateral</span>
              </button>
              <button
                className="fan-tool"
                title="Vista superior"
                onClick={() => {
                  setCameraMode('guided');
                  camera('top');
                }}
              >
                ⬒<span>Superior</span>
              </button>
              <button
                className="fan-tool"
                title="Restablecer cámara"
                onClick={() => {
                  setCameraMode('guided');
                  camera('reset');
                }}
              >
                ⌂<span>Restablecer</span>
              </button>
            </div>
            {loose.includes(selected) && !installed.includes(selected) && (
              <div
                className="fan-piece-toolbar"
                role="toolbar"
                aria-label={`Controles de ${selectedFan.name}`}
              >
                <button
                  className="fan-tool"
                  title="Girar pieza a la izquierda"
                  disabled={busy}
                  onClick={() => rotateSelected(-1)}
                >
                  ↶<span>Izquierda</span>
                </button>
                <button
                  className="fan-tool"
                  title="Girar pieza a la derecha"
                  disabled={busy}
                  onClick={() => rotateSelected(1)}
                >
                  ↷<span>Derecha</span>
                </button>
                <button
                  className="fan-tool fan-tool-primary"
                  title="Insertar pieza"
                  disabled={!aligned[selected] || busy}
                  onClick={insertSelected}
                >
                  ⤓<span>Insertar</span>
                </button>
                <button
                  className="fan-tool"
                  title="Reiniciar posición"
                  disabled={busy}
                  onClick={resetSelectedPosition}
                >
                  ↺<span>Posición</span>
                </button>
                <button
                  className="fan-tool fan-tool-danger"
                  title="Cancelar y devolver al inventario"
                  disabled={busy}
                  onClick={cancelSelected}
                >
                  ✕<span>Cancelar</span>
                </button>
              </div>
            )}
          </div>
          <div className="viewer-toolbar">
            <p>
              Flujo: inventario → soltar en visor → mover/orientar → insertar → arrastrar tornillos.
            </p>
          </div>
        </section>
        <aside className="panel fans-details">
          <div className="panel-heading">
            <h2>Guía del paso</h2>
            <span>Beta</span>
          </div>
          <div className="details-content">
            <span className="eyebrow">Pieza seleccionada</span>
            <h2>{selectedFan.name}</h2>
            <p className="detail-spec">{message}</p>
            {installed.includes(selected) && (
              <div className="fan-screw-panel">
                <strong>Tornillos {screwCount(selected)}/4</strong>
                <div className="fan-screw-grid">
                  {screws[selected].map((placed, index) => (
                    <span key={index} className={`fan-screw-status ${placed ? 'placed' : ''}`}>
                      {placed ? '✓' : '○'} Tornillo {index + 1}
                    </span>
                  ))}
                </div>
                <small>Arrastra los tornillos numerados del visor hacia los aros azules.</small>
              </div>
            )}
            <hr />
            <span className="eyebrow">Vista previa RGB</span>
            <div className="fan-preview-controls">
              <label>
                <input
                  type="radio"
                  name="rgb-preview"
                  checked={previewMode === 'off'}
                  onChange={() => setPreviewMode('off')}
                />{' '}
                Apagado
              </label>
              <label>
                <input
                  type="radio"
                  name="rgb-preview"
                  checked={previewMode === 'fixed'}
                  onChange={() => setPreviewMode('fixed')}
                />{' '}
                Color fijo
              </label>
              <label>
                <input
                  type="radio"
                  name="rgb-preview"
                  checked={previewMode === 'rainbow'}
                  onChange={() => setPreviewMode('rainbow')}
                />{' '}
                Arcoíris
              </label>
              <input
                type="color"
                value={fixedColor}
                disabled={previewMode !== 'fixed'}
                onChange={(event) => setFixedColor(event.target.value)}
                aria-label="Color ARGB fijo"
              />
              <label>
                <input
                  type="checkbox"
                  checked={spinPreview}
                  onChange={(event) => setSpinPreview(event.target.checked)}
                />{' '}
                Vista previa de giro
              </label>
            </div>
            <p className="notice small">
              Previsualización ilustrativa. No representa conexiones reales PWM de 4 pines ni ARGB
              de 5 V.
            </p>
          </div>
        </aside>
      </main>
      {inventoryPointer && !inventoryPointer.inside && (
        <div
          className="fan-inventory-ghost"
          style={{ left: inventoryPointer.clientX + 14, top: inventoryPointer.clientY + 14 }}
        >
          <span>✣</span>
          {fanDefinitions.find((fan) => fan.id === inventoryPointer.id)!.name}
        </div>
      )}
    </section>
  );
}
