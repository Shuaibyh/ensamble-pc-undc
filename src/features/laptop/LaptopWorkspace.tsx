import { useEffect, useRef, useState } from 'react';
import { LaptopScene, type LaptopCameraCommand, type LaptopView } from '../../scene/LaptopScene';
import { laptopParts, laptopConnectionIds, laptopPartById } from '../../data/laptop';
import {
  emptyLaptopAssembly,
  installLaptopPart,
  laptopIssues,
  laptopRemovalIssues,
  removeLaptopPart,
  checkLaptopAssembly,
  type LaptopPartId,
  type LaptopAssembly,
} from '../../domain/laptop';
import { LaptopPartIcon } from './LaptopPartIcon';
import type { Mode } from '../../domain/session';
import { SimulatorHeader } from '../../components/ui/SimulatorHeader';
import { PanelToggle } from '../../components/ui/PanelToggle';
import { CameraToolbar } from '../../components/ui/CameraToolbar';
import { AssemblyStages } from '../../components/ui/AssemblyStages';
import { emptyPractice, recordPractice, restorePractice } from '../../domain/practice';

const storageKey = 'undc-laptop-assembly-v4-original';
function restore(): LaptopAssembly {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!Array.isArray(saved?.installed)) return emptyLaptopAssembly();
    return laptopParts.reduce(
      (state, part) =>
        saved.installed.includes(part.id) && part.id !== 'base'
          ? installLaptopPart(state, part.id)
          : state,
      emptyLaptopAssembly(),
    );
  } catch {
    return emptyLaptopAssembly();
  }
}
function category(id: LaptopPartId) {
  return ['lowerCover', 'screws'].includes(id)
    ? 'Cierre'
    : laptopConnectionIds.includes(id)
      ? 'Conexiones'
      : 'Componentes';
}
export function LaptopWorkspace({
  onReturn,
  mode,
  onMode,
}: {
  onReturn: () => void;
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  const [dragMode, setDragMode] = useState(true);
  const [manualActive, setManualActive] = useState(false);
  const [manualVersion, setManualVersion] = useState(0);
  const [located, setLocated] = useState<LaptopPartId | null>(null);
  const [practice, setPractice] = useState(() => {
    try {
      return restorePractice(localStorage.getItem('undc-laptop-practice-v1'));
    } catch {
      return emptyPractice();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('undc-laptop-practice-v1', JSON.stringify(practice));
    } catch {
      /* Practice also works without storage. */
    }
  }, [practice]);
  function record(event: 'error' | 'hint') {
    setPractice((previous) => recordPractice(previous, mode, event));
  }
  function locate() {
    record('hint');
    setLocated(selected);
    view('focus');
  }
  const [assembly, setAssembly] = useState(restore);
  const [selected, setSelected] = useState<LaptopPartId>('motherboard');
  const [busy, setBusy] = useState<LaptopPartId | null>(null);
  const operation = useRef<LaptopPartId | null>(null);
  const [message, setMessage] = useState(
    'Selecciona una pieza para conocer su función y colocarla.',
  );
  const [command, setCommand] = useState<LaptopCameraCommand>({ type: 'home', serial: 0 });
  const [interior, setInterior] = useState(false);
  const [powered, setPowered] = useState(false);
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (!powered) return;
    const timer = window.setTimeout(
      () => setBooted(true),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2400,
    );
    return () => window.clearTimeout(timer);
  }, [powered]);
  const [filter, setFilter] = useState('Todas');
  const [catalogHidden, setCatalogHidden] = useState(false);
  const [detailsHidden, setDetailsHidden] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(assembly));
    } catch {
      /* Storage is optional. */
    }
  }, [assembly]);
  const part = laptopPartById(selected);
  const total = laptopParts.length - 1;
  const count = assembly.installed.length - 1;
  const complete = checkLaptopAssembly(assembly).length === 0;
  const closed = assembly.installed.includes('lowerCover');
  const installed = assembly.installed.includes(selected);
  const issues = installed ? [] : laptopIssues(assembly, selected);
  const removal = installed ? laptopRemovalIssues(assembly, selected) : [];
  const next = laptopParts.find(
    (item) => item.id !== 'base' && !laptopIssues(assembly, item.id).length,
  );
  const isCable = laptopConnectionIds.includes(selected);
  function view(type: LaptopView) {
    setCommand((prev) => ({ type, serial: prev.serial + 1 }));
  }
  function select(id: LaptopPartId) {
    if (!operation.current && !manualActive) {
      setSelected(id);
      setLocated(null);
      setMessage('');
    }
  }
  function install(id = selected) {
    if (id === 'screws') {
      select(id);
      return;
    }
    if (operation.current || powered) return;
    const errors = laptopIssues(assembly, id);
    if (errors.length) {
      record('error');
      setMessage(errors.join(' '));
      return;
    }
    operation.current = id;
    setSelected(id);
    setBusy(id);
    setMessage(`Colocando: ${laptopPartById(id).name}…`);
  }
  function installedAnimation(id: LaptopPartId) {
    if (operation.current !== id) return;
    operation.current = null;
    setAssembly((prev) => installLaptopPart(prev, id));
    setBusy(null);
    setMessage(`${laptopPartById(id).name}: instalación completada.`);
    if (id === 'lowerCover') {
      setInterior(false);
      view('home');
    }
  }
  function remove() {
    if (busy || powered) return;
    if (removal.length) {
      record('error');
      setMessage(removal.join(' '));
      return;
    }
    setAssembly((prev) => removeLaptopPart(prev, selected));
    setMessage(`${part.name}: retirada.`);
  }
  function reset() {
    if (operation.current) return;
    setManualVersion((v) => v + 1);
    setManualActive(false);
    setAssembly(emptyLaptopAssembly());
    setPractice(emptyPractice());
    setLocated(null);
    setSelected('motherboard');
    setPowered(false);
    setBooted(false);
    setInterior(false);
    setFilter('Todas');
    view('home');
    setMessage('Chasis preparado. Comienza con la placa madre.');
  }
  function check() {
    const missing = checkLaptopAssembly(assembly);
    setMessage(
      missing.length
        ? mode === 'learn'
          ? `Faltan ${missing.length} pasos. Siguiente: ${next?.name ?? missing[0]}.`
          : `Faltan ${missing.length} pasos. Revisa los componentes, conexiones y cierre.`
        : 'Montaje verificado: componentes, conexiones, tapa y tornillos completos.',
    );
  }
  const status = powered
    ? booted
      ? 'Windows 11 · Encendido simulado'
      : 'Iniciando el sistema…'
    : closed
      ? interior
        ? 'Vista de servicio · corte de inspección'
        : 'Carcasa superior colocada'
      : 'Vista de servicio · interior abierto';
  return (
    <section className="laptop-workspace">
      <SimulatorHeader
        title="Ensamblar laptop"
        eyebrow="Componentes · conexiones · encendido"
        description={
          mode === 'learn'
            ? 'Explora cada componente, conecta el interior y cierra la base al terminar.'
            : 'Decide el orden de montaje. Las ayudas y los intentos no válidos quedan registrados.'
        }
        mode={mode}
        disabled={!!busy || manualActive}
        onMode={(nextMode) => {
          setLocated(null);
          onMode(nextMode);
        }}
        actions={
          <>
            <button
              className="button secondary"
              disabled={!!busy || manualActive}
              aria-pressed={dragMode}
              onClick={() => {
                setDragMode(!dragMode);
                setManualActive(false);
              }}
            >
              {dragMode
                ? 'Modo interactivo · cambiar a clásico'
                : 'Modo clásico · activar interactivo'}
            </button>
            <button className="button ghost danger" disabled={!!busy} onClick={reset}>
              Reiniciar laptop
            </button>
            <button className="button ghost" disabled={!!busy} onClick={onReturn}>
              Volver al inicio
            </button>
          </>
        }
      >
        <AssemblyStages
          stages={[
            {
              name: 'Componentes',
              completed: laptopParts
                .filter((p) => category(p.id) === 'Componentes')
                .every((p) => assembly.installed.includes(p.id)),
            },
            {
              name: 'Conexiones',
              completed: laptopConnectionIds.every((id) => assembly.installed.includes(id)),
            },
            { name: 'Cierre', completed: closed && assembly.installed.includes('screws') },
            { name: 'Encendido', completed: powered && booted },
          ]}
        />
      </SimulatorHeader>
      <div
        className={`laptop-layout ${catalogHidden ? 'hide-catalog' : ''} ${detailsHidden ? 'hide-details' : ''}`}
      >
        {!catalogHidden && (
          <aside className="panel laptop-catalog" id="laptop-catalog">
            <div className="panel-heading">
              <h2>Componentes</h2>
              <span>
                {count}/{total}
              </span>
              <PanelToggle
                open
                panel="laptop-catalog"
                label="Componentes"
                onToggle={() => setCatalogHidden(true)}
              />
            </div>
            {dragMode && (
              <p className="small muted">
                Arrastra una tarjeta al visor, mueve y gira la pieza. Pulsa Insertar al alinearla.
                Para cada tornillo: selecciona su punto en el visor y pulsa Insertar.
              </p>
            )}
            <label className="laptop-filter">
              Categoría
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {['Todas', 'Componentes', 'Conexiones', 'Cierre'].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <div className="catalog-list">
              {laptopParts
                .filter((p) => p.id !== 'base' && (filter === 'Todas' || category(p.id) === filter))
                .map((item) => {
                  const done = assembly.installed.includes(item.id);
                  const blocked = !done && !!laptopIssues(assembly, item.id).length;
                  return (
                    <button
                      key={item.id}
                      data-part={item.id}
                      className={`part-card ${selected === item.id ? 'selected' : ''}`}
                      aria-pressed={selected === item.id}
                      disabled={!!busy || manualActive}
                      onClick={() => select(item.id)}
                      draggable={
                        item.id !== 'screws' &&
                        dragMode &&
                        !done &&
                        !busy &&
                        !powered &&
                        !manualActive
                      }
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', 'laptop:' + item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        select(item.id);
                        setLocated(item.id);
                        setInterior(false);
                        view('focus');
                      }}
                    >
                      <LaptopPartIcon name={item.icon} />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                        <span className={`badge ${done ? 'success' : blocked ? 'blocked' : ''}`}>
                          {done
                            ? '✓ Completado'
                            : mode === 'learn' && blocked
                              ? 'Requiere paso previo'
                              : 'Pendiente'}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </aside>
        )}
        <section className="viewer laptop-viewer" aria-label="Visor de montaje de laptop">
          <div className="viewer-heading">
            {catalogHidden && (
              <PanelToggle
                open={false}
                panel="laptop-catalog"
                label="Componentes"
                onToggle={() => setCatalogHidden(false)}
              />
            )}
            {detailsHidden && (
              <PanelToggle
                open={false}
                panel="laptop-details"
                label="Información"
                onToggle={() => setDetailsHidden(false)}
              />
            )}
            <span>
              <i />
              Área de ensamblaje
            </span>
            <span>{status}</span>
          </div>
          <div className="canvas-container">
            <LaptopScene
              key={manualVersion}
              assembly={assembly}
              dragEnabled={dragMode}
              onManualActivity={setManualActive}
              onManualComplete={(ids) => {
                setAssembly((prev) =>
                  ids.reduce((state, id) => installLaptopPart(state, id), prev),
                );
                setManualActive(false);
                setMessage('Instalación manual y fijaciones completadas.');
                if (ids.includes('lowerCover')) {
                  setInterior(false);
                  view('home');
                }
              }}
              selected={selected}
              highlight={mode === 'learn' || located === selected}
              busy={busy}
              interior={interior}
              powered={powered}
              booted={booted}
              command={command}
              onInstall={install}
              onInstalled={installedAnimation}
            />
          </div>
          <div className="viewer-toolbar">
            <CameraToolbar
              focus
              disabled={!!busy}
              onAction={(action) => {
                if (action === 'focus') {
                  if (mode === 'practice' && !installed) record('hint');
                  view('focus');
                } else view(action === 'reset' ? 'home' : action);
              }}
            >
              <button className="button secondary" onClick={() => view('top')}>
                Vista superior
              </button>
              <button className="button secondary" onClick={() => view('bottom')}>
                Vista inferior
              </button>
              {closed && (
                <button
                  className="button compact secondary"
                  aria-pressed={interior}
                  onClick={() => setInterior(!interior)}
                >
                  {interior ? 'Ver exterior' : 'Inspeccionar interior'}
                </button>
              )}
            </CameraToolbar>
            <p>
              {!closed || interior
                ? 'Vista de servicio: la cubierta superior se oculta para ver el interior. '
                : ''}
              Arrastra el fondo para girar; usa la rueda para acercar.
            </p>
          </div>
        </section>
        {!detailsHidden && (
          <aside className="panel details-panel laptop-details" id="laptop-details">
            <div className="panel-heading">
              <h2>Información</h2>
              <PanelToggle
                open
                panel="laptop-details"
                label="Información"
                onToggle={() => setDetailsHidden(true)}
              />
            </div>
            <div className="details-content">
              <span className="eyebrow">{category(selected)}</span>
              <h2>{part.name}</h2>
              <p className="detail-spec">{part.description}</p>
              <h3>¿Para qué sirve?</h3>
              <p>{part.purpose}</p>
              {(mode === 'learn' || located === selected || installed) && (
                <>
                  <h3>Ubicación</h3>
                  <p>{part.location}</p>
                </>
              )}
              <div className="detail-actions">
                <button
                  className="button primary"
                  data-action="install-laptop"
                  disabled={
                    selected === 'screws' ||
                    dragMode ||
                    installed ||
                    !!busy ||
                    powered ||
                    (mode === 'learn' && !!issues.length)
                  }
                  onClick={() => install()}
                >
                  {selected === 'screws' && !installed
                    ? 'Selecciona un punto en el visor'
                    : dragMode && !installed
                      ? 'Arrastra la tarjeta al visor'
                      : busy
                        ? 'Colocando…'
                        : isCable
                          ? 'Conectar'
                          : 'Instalar'}
                </button>
                <button
                  className="button secondary"
                  disabled={
                    manualActive ||
                    !installed ||
                    !!busy ||
                    powered ||
                    (mode === 'learn' && !!removal.length)
                  }
                  onClick={remove}
                >
                  {isCable ? 'Desconectar' : 'Retirar'}
                </button>
                <button className="button secondary" disabled={!!busy} onClick={locate}>
                  Ver ubicación{mode === 'practice' ? ' · ayuda' : ''}
                </button>
              </div>
              {powered ? (
                <p className="notice">Apaga la simulación para modificar el montaje.</p>
              ) : mode === 'learn' && issues.length ? (
                <div className="notice">
                  <strong>Antes de continuar</strong>
                  <ul>
                    {issues.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </div>
              ) : mode === 'learn' && installed && removal.length ? (
                <div className="laptop-dependencies">
                  <strong>Para retirar</strong>
                  <p>{removal.join(' ')}</p>
                </div>
              ) : null}
              <p className="laptop-status" role="status" aria-live="polite">
                {message ||
                  (installed
                    ? 'Pieza instalada en su ubicación.'
                    : isCable
                      ? 'Selecciona Conectar para realizar la conexión.'
                      : selected === 'screws'
                        ? 'Selecciona un punto de fijación y pulsa Insertar.'
                        : dragMode
                          ? 'Arrastra, gira y alinea en el visor; luego pulsa Insertar.'
                          : 'Selecciona Instalar para intentar colocar la pieza.')}
              </p>
              {mode === 'learn' && next && !busy && (
                <button
                  className="button laptop-next"
                  onClick={() => {
                    setFilter('Todas');
                    select(next.id);
                  }}
                >
                  Siguiente: {next.name} →
                </button>
              )}
              <details className="laptop-source">
                <summary>Modelo y montaje</summary>
                <p>
                  Interior adaptado del modelo Framework y cubierta integrada de laptop. Las
                  conexiones son representaciones educativas; no representan compatibilidad entre
                  equipos comerciales.
                </p>
              </details>
            </div>
          </aside>
        )}
      </div>
      <section className="progress-panel laptop-progress">
        <div className="progress-summary">
          <strong>{Math.round((count / total) * 100)}% completado</strong>
          <span>
            {count}/{total} pasos realizados
          </span>
          <progress aria-label="Progreso de la laptop" value={count} max={total} />
        </div>
        <p>
          {powered
            ? booted
              ? 'Laptop completada. Windows 11 está listo.'
              : 'Montaje verificado. Iniciando Windows 11…'
            : complete
              ? 'Laptop cerrada y asegurada. Ya puedes comprobar el encendido.'
              : closed
                ? 'Fija los tornillos para asegurar la tapa inferior.'
                : 'Instala las piezas y conexiones antes de cerrar la tapa inferior.'}
        </p>
        <div className="detail-actions">
          <button className="button" disabled={!!busy} onClick={check}>
            Comprobar montaje
          </button>
          <button
            className="button primary"
            disabled={!complete || !!busy}
            onClick={() => {
              if (!powered && checkLaptopAssembly(assembly).length) return;
              setBooted(false);
              setPowered(!powered);
              setInterior(false);
              view('home');
              setMessage(powered ? 'Simulación apagada.' : 'Encendido simulado: montaje completo.');
            }}
          >
            {powered ? 'Apagar' : 'Comprobar y encender'}
          </button>
        </div>
      </section>
      {powered && (
        <section className="laptop-completion" aria-label="Resultado del ensamblaje de laptop">
          <div role="status">
            <span className="eyebrow">
              {booted ? '✓ Experiencia completada' : 'Encendido en curso'}
            </span>
            <h2>{booted ? 'Tu laptop está lista' : 'Iniciando Windows 11…'}</h2>
            <p>
              {booted
                ? 'Componentes, conexiones y cierre verificados. Has completado el ensamblaje y el encendido simulado.'
                : 'Montaje validado. Preparando el escritorio de la laptop.'}
            </p>
          </div>
          {booted && (
            <div className="detail-actions">
              <button className="button secondary" onClick={onReturn}>
                Volver al inicio
              </button>
              <button className="button ghost danger" onClick={reset}>
                Reiniciar laptop
              </button>
            </div>
          )}
        </section>
      )}
      {mode === 'practice' && (
        <section className="evaluation-panel" aria-label="Registro de práctica de laptop">
          <h2>Tu práctica de laptop</h2>
          <p>
            Registro local de intentos y ayudas. Cambiar de modo conserva los contadores; reiniciar
            laptop los borra.
          </p>
          <dl className="evaluation-stats">
            <div>
              <dt>Intentos no válidos</dt>
              <dd>{practice.errors}</dd>
            </div>
            <div>
              <dt>Ayudas solicitadas</dt>
              <dd>{practice.hints}</dd>
            </div>
          </dl>
        </section>
      )}
    </section>
  );
}
