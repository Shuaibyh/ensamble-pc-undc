import { lazy, Suspense, useEffect, useState } from 'react';
import { parts, cables } from './data/catalog';
import type { PartId, CableId } from './domain/types';
import type { Action } from './domain/assembly';
import type { Mode } from './domain/session';
import { useAssembly } from './hooks/useAssembly';
import { CatalogPanel } from './features/catalog/CatalogPanel';
import { PartDetails } from './features/assembly/PartDetails';
import { ConnectionPanel } from './features/assembly/ConnectionPanel';
import { ProgressPanel } from './features/assembly/ProgressPanel';
import { EvaluationPanel } from './features/evaluation/EvaluationPanel';
import { SetupWorkspace } from './features/setup/SetupWorkspace';
import { SimulatorHeader } from './components/ui/SimulatorHeader';
import { PanelToggle } from './components/ui/PanelToggle';
import { CameraToolbar } from './components/ui/CameraToolbar';
import { PrimaryNavigation } from './components/ui/PrimaryNavigation';
import { PcJourney } from './components/ui/PcJourney';
import { Global3DLoader } from './components/ui/Global3DLoader';

import { Landing } from './features/home/Landing';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import type { CameraCommand } from './scene/CameraRig';
import {
  resolveNavigation,
  sectionPath,
  viewPaths,
  type AppView,
  type HomeSection,
} from './navigation';

const LaptopWorkspace = lazy(() =>
  import('./features/laptop/LaptopWorkspace').then((module) => ({
    default: module.LaptopWorkspace,
  })),
);
const Scene = lazy(() => import('./scene/PcScene'));
const ReceivedCaseViewer = lazy(() => import('./scene/ReceivedCaseViewer'));
function initialView(): AppView {
  return resolveNavigation(window.location).view;
}

export default function App() {
  const { session, dispatch, saved } = useAssembly();
  const [view, setView] = useState<AppView>(initialView);
  const [dragMode, setDragMode] = useState(true);
  const [manualActive, setManualActive] = useState(false);
  const [manualVersion, setManualVersion] = useState(0);
  const [section, setSection] = useState<HomeSection | undefined>(
    () => resolveNavigation(window.location).section,
  );
  const [selected, setSelected] = useState<PartId>('standoffs');
  const [located, setLocated] = useState<PartId | null>(null);
  const [closurePending, setClosurePending] = useState(false);
  const panelVisible = session.caseClosed || closurePending;
  function setPanelVisible(closed: boolean) {
    if (closed) {
      if (!internalComplete || session.assembly.powered || session.busy || manualActive) return;
      setClosurePending(true);
    } else {
      setClosurePending(false);
      dispatch({ type: 'case', closed: false });
    }
  }
  const [showPoints, setShowPoints] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({
    action: 'reset',
    sequence: 0,
    target: [0, 0, 0],
  });
  const part = parts.find((item) => item.id === selected)!;
  const disabled = !!session.busy || manualActive;
  const internalComplete =
    session.assembly.installed.length === parts.length &&
    session.assembly.connected.length === cables.length;

  useEffect(() => {
    if (!session.assembly.powered || session.experienceCompleted) return;
    const timer = window.setTimeout(
      () => dispatch({ type: 'boot-complete' }),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3200,
    );
    return () => window.clearTimeout(timer);
  }, [session.assembly.powered, session.experienceCompleted, dispatch]);

  useEffect(() => {
    function applyBrowserLocation() {
      const target = resolveNavigation(window.location);
      setSection(target.section);
      setView(target.view);
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          if (target.section) scrollToSection(target.section, false);
          else window.scrollTo({ top: 0, behavior: 'auto' });
        }),
      );
    }
    window.addEventListener('popstate', applyBrowserLocation);
    const initial = resolveNavigation(window.location);
    if (initial.section) {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => scrollToSection(initial.section!, false)),
      );
    }
    return () => window.removeEventListener('popstate', applyBrowserLocation);
  }, []);

  function command(action: Action) {
    if (action.type === 'install' && action.id === 'board-screws') {
      select(action.id);
      return;
    }
    dispatch({ type: 'command', action });
  }
  function select(id: PartId) {
    if (manualActive) return;
    setSelected(id);
    setLocated(null);
  }
  function camera(action: CameraCommand['action']) {
    setCameraCommand((previous) => ({
      action,
      sequence: previous.sequence + 1,
      target: part.position,
    }));
  }
  function locate() {
    dispatch({ type: 'hint', name: part.name });
    setLocated(selected);
    setPanelVisible(false);
    camera('focus');
  }
  function focus() {
    if (session.mode === 'practice' && !session.assembly.installed.includes(selected))
      dispatch({ type: 'hint', name: part.name });
    setPanelVisible(false);
    camera('focus');
  }
  function toggleCable(id: CableId) {
    setPanelVisible(false);
    command({ type: session.assembly.connected.includes(id) ? 'disconnect' : 'connect', id });
  }
  function reset() {
    setManualVersion((v) => v + 1);
    setManualActive(false);
    command({ type: 'reset' });
    try {
      localStorage.removeItem('ensamble-pc-undc:setup-v1');
    } catch {
      // El reinicio interno funciona aunque el almacenamiento esté bloqueado.
    }
    setSelected('standoffs');
    setLocated(null);
    setPanelVisible(false);
    setShowPoints(false);
    camera('reset');
  }
  function mode(mode: Mode) {
    dispatch({ type: 'mode', mode });
    setLocated(null);
  }
  function updateAddress(path: string) {
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (current !== path) window.history.pushState({ from: view }, '', path);
  }
  function scrollToSection(id: HomeSection, smooth = true) {
    const target = document.getElementById(id);
    if (!target) return;
    const header = document.querySelector('.topbar');
    const offset = (header?.getBoundingClientRect().height ?? 0) + 24;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top,
      behavior:
        smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'smooth'
          : 'auto',
    });
  }
  function openView(next: AppView) {
    updateAddress(viewPaths[next]);
    setSection(undefined);
    setView(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function returnToAssembly() {
    if (window.history.state?.from === 'assembly') window.history.back();
    else openView('assembly');
  }

  function openHomeSection(id: HomeSection) {
    updateAddress(sectionPath(id));
    setSection(id);
    setView('home');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollToSection(id)));
  }

  return (
    <div className="app">
      <a className="skip-link" href="#laboratory-content">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="identity">
          <div className="brand-logos" aria-label="Identidad institucional">
            <span className="logo-frame faculty-frame">
              <span className="logo-fallback faculty-fallback" aria-hidden="true">
                FI
              </span>
              <img
                src="/landing-final/imagenes/institucional/logo_facultad_ingenieria.png"
                alt="Escudo de la Facultad de Ingeniería de la Universidad Nacional de Cañete"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
                onLoad={(event) => {
                  event.currentTarget.previousElementSibling?.setAttribute('hidden', 'true');
                }}
              />
            </span>
            <span className="logo-frame university-frame">
              <span className="logo-fallback university-fallback" aria-hidden="true">
                UNDC
              </span>
              <img
                className="university-logo"
                src="/landing-final/imagenes/institucional/logo_undc.png"
                alt="Logo de la Universidad Nacional de Cañete"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
                onLoad={(event) => {
                  event.currentTarget.previousElementSibling?.setAttribute('hidden', 'true');
                }}
              />
            </span>
          </div>
          <div>
            <strong>
              Laboratorio Interactivo de Hardware <span>UNDC</span>
            </strong>
            <small>PC, laptop, componentes y conexiones en 3D</small>
          </div>
        </div>
        <PrimaryNavigation
          key={`${view}:${section ?? ''}`}
          view={view}
          section={section}
          onOpen={openView}
          onSection={openHomeSection}
        />
      </header>
      <div id="laboratory-content" tabIndex={-1} />
      {!saved && (
        <p className="notice" role="status">
          El navegador no permite guardar. Puedes continuar; el progreso se conserva mientras esta
          página permanezca abierta.
        </p>
      )}
      {view === 'home' && <Landing onOpen={openView} onSection={openHomeSection} />}
      {view === 'laptop' && (
        <ErrorBoundary
          fallback={
            <div className="scene-fallback" role="alert">
              No se pudo abrir la laptop.{' '}
              <button className="button" onClick={() => window.location.reload()}>
                Reintentar
              </button>
            </div>
          }
        >
          <Suspense fallback={<Global3DLoader variant="laptop" />}>
            <LaptopWorkspace mode={session.mode} onMode={mode} onReturn={() => openView('home')} />
          </Suspense>
        </ErrorBoundary>
      )}
      {view === 'library' && (
        <ErrorBoundary
          fallback={
            <div className="messages" role="alert">
              No se pudo cargar el explorador 3D.{' '}
              <button className="button" onClick={() => openView('assembly')}>
                Ir al ensamblaje
              </button>
            </div>
          }
        >
          <Suspense fallback={<Global3DLoader variant="library" />}>
            <ReceivedCaseViewer onReturn={() => openView('home')} />
          </Suspense>
        </ErrorBoundary>
      )}
      {view === 'assembly' && (
        <div className="pc-phase" key="assembly">
          <SimulatorHeader
            title="Ensamblar PC"
            eyebrow="Componentes · conexiones · encendido"
            description={
              session.mode === 'learn'
                ? 'Selecciona una pieza, conoce su función y construye tu PC paso a paso.'
                : 'Decide el orden de montaje. Las ayudas y los intentos no válidos quedan registrados.'
            }
            mode={session.mode}
            onMode={mode}
            disabled={disabled}
            actions={
              <>
                <button
                  className="button secondary"
                  aria-pressed={dragMode}
                  disabled={disabled}
                  onClick={() => {
                    setDragMode(!dragMode);
                    setManualActive(false);
                  }}
                >
                  {dragMode
                    ? 'Modo interactivo · cambiar a clásico'
                    : 'Modo clásico · activar interactivo'}
                </button>
                <button className="button ghost danger" disabled={disabled} onClick={reset}>
                  Reiniciar ensamblaje
                </button>
                <button className="button ghost" onClick={() => openView('home')}>
                  Volver al inicio
                </button>
              </>
            }
          >
            <PcJourney session={session} />
          </SimulatorHeader>
          <main
            className={`workspace ${catalogOpen ? '' : 'catalog-collapsed'} ${detailsOpen ? '' : 'details-collapsed'}`}
          >
            {catalogOpen && (
              <aside className="panel catalog" id="catalog-panel">
                <div className="panel-heading">
                  <h2>Componentes</h2>
                  <span>
                    {session.assembly.installed.length}/{parts.length}
                  </span>
                  <PanelToggle
                    open
                    panel="catalog-panel"
                    label="Componentes"
                    onToggle={() => setCatalogOpen(false)}
                  />
                </div>
                <CatalogPanel
                  assembly={session.assembly}
                  selected={selected}
                  disabled={disabled}
                  onSelect={select}
                  dragEnabled={dragMode && !panelVisible && !session.assembly.powered}
                  onDragStart={(id) => {
                    select(id);
                    setLocated(id);
                    const item = parts.find((p) => p.id === id)!;
                    setCameraCommand((previous) => ({
                      action: 'focus',
                      sequence: previous.sequence + 1,
                      target: item.position,
                    }));
                  }}
                />
              </aside>
            )}
            <section className="viewer" aria-label="Visor 3D del gabinete">
              <div className="viewer-heading">
                {!catalogOpen && (
                  <PanelToggle
                    open={false}
                    panel="catalog-panel"
                    label="Componentes"
                    onToggle={() => setCatalogOpen(true)}
                  />
                )}
                {!detailsOpen && (
                  <PanelToggle
                    open={false}
                    panel="details-panel"
                    label="Información"
                    onToggle={() => setDetailsOpen(true)}
                  />
                )}
                <span>
                  <i /> Área de ensamblaje
                </span>
                <span>{panelVisible ? 'Panel lateral colocado' : 'Interior abierto'}</span>
              </div>
              <div className="canvas-container">
                <ErrorBoundary
                  fallback={
                    <div className="scene-fallback" role="alert">
                      No se pudo cargar el visor.
                      <button className="button secondary" onClick={() => window.location.reload()}>
                        Reintentar carga
                      </button>
                    </div>
                  }
                >
                  <Suspense fallback={<Global3DLoader variant="pc" />}>
                    <Scene
                      key={manualVersion}
                      assembly={session.assembly}
                      selected={selected}
                      highlight={session.mode === 'learn' || located === selected}
                      busy={session.busy}
                      panelVisible={panelVisible}
                      closurePending={closurePending}
                      onClosureComplete={() => {
                        dispatch({ type: 'case', closed: true });
                        setClosurePending(false);
                        setManualActive(false);
                      }}
                      onClosureCancel={() => {
                        setPanelVisible(false);
                        setManualActive(false);
                      }}
                      showPoints={showPoints}
                      dragEnabled={dragMode}
                      onManualActivity={setManualActive}
                      onManualComplete={(ids) => {
                        for (const id of ids) {
                          dispatch({ type: 'command', action: { type: 'install', id } });
                          dispatch({ type: 'finish', id });
                        }
                        setManualActive(false);
                      }}
                      cameraCommand={cameraCommand}
                      onSelect={select}
                      onToggleCable={toggleCable}
                      onFinish={(id) => dispatch({ type: 'finish', id })}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
              <div className="viewer-toolbar" aria-label="Controles del visor">
                <CameraToolbar
                  focus
                  disabled={disabled}
                  onAction={(action) => (action === 'focus' ? focus() : camera(action))}
                >
                  <button className="button secondary" onClick={() => camera('front')}>
                    Vista frontal
                  </button>
                </CameraToolbar>
                <div className="scene-options">
                  <button
                    className={`button compact closure-button ${panelVisible ? 'closed' : ''}`}
                    disabled={
                      disabled || session.assembly.powered || (!internalComplete && !panelVisible)
                    }
                    onClick={() => setPanelVisible(!panelVisible)}
                    title={
                      internalComplete
                        ? undefined
                        : 'Completa primero las piezas y conexiones internas'
                    }
                  >
                    {panelVisible ? 'Abrir gabinete' : 'Colocar panel y seleccionar tornillos'}
                  </button>
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={showPoints}
                      onChange={(event) => setShowPoints(event.target.checked)}
                    />{' '}
                    Puntos de alimentación
                  </label>
                </div>
                <p>
                  Arrastra para girar · Rueda o botones para acercar
                  {panelVisible ? ' · Abre el gabinete para modificar el interior.' : ''}
                </p>
              </div>
            </section>
            {detailsOpen && (
              <aside className="panel details-panel" id="details-panel">
                <div className="panel-heading">
                  <h2>Información</h2>
                  <PanelToggle
                    open
                    panel="details-panel"
                    label="Información"
                    onToggle={() => setDetailsOpen(false)}
                  />
                </div>
                <PartDetails
                  part={part}
                  locationVisible={session.mode === 'learn' || located === selected}
                  session={session}
                  manual={(dragMode && selected !== 'paste') || selected === 'board-screws'}
                  manipulating={manualActive}
                  onInstall={() => {
                    setPanelVisible(false);
                    command({ type: 'install', id: selected });
                  }}
                  onRemove={() => {
                    setPanelVisible(false);
                    command({ type: 'remove', id: selected });
                  }}
                  onLocate={locate}
                />
                <ConnectionPanel
                  assembly={session.assembly}
                  disabled={disabled || session.assembly.powered}
                  onToggle={toggleCable}
                />
              </aside>
            )}
          </main>
          <ProgressPanel
            session={session}
            caseClosed={session.caseClosed}
            closurePending={closurePending}
            onToggleCase={() => setPanelVisible(!panelVisible)}
            onCheck={() => dispatch({ type: 'check' })}
            onContinue={() => openView('setup')}
          />
          <div aria-live="polite" aria-atomic="true">
            {session.messages.length > 0 && (
              <section className="messages">
                <h2>Resultado de la acción</h2>
                <ul>
                  {session.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          {(session.mode === 'practice' || session.assembly.powered) && (
            <EvaluationPanel session={session} />
          )}
        </div>
      )}
      {view === 'setup' && (
        <SetupWorkspace
          session={session}
          dispatch={dispatch}
          onReturn={returnToAssembly}
          onHome={() => openView('home')}
          onExplore={() => openView('library')}
          onRestart={() => {
            reset();
            openView('assembly');
          }}
          internalConnected={session.assembly.connected}
          installed={session.assembly.installed}
          internalComplete={internalComplete}
          powered={session.assembly.powered}
          onPower={() => dispatch({ type: 'setup-power' })}
        />
      )}
      <footer>
        <span>Laboratorio Interactivo de Hardware UNDC · Universidad Nacional de Cañete</span>
        <span>
          Ingeniería de Sistemas · Proyecto académico ·{' '}
          <a
            href="#creditos"
            onClick={(event) => {
              event.preventDefault();
              openHomeSection('creditos');
            }}
          >
            Créditos
          </a>
        </span>
      </footer>
    </div>
  );
}
