import { SimulatorHeader } from '../../components/ui/SimulatorHeader';
import { CameraToolbar } from '../../components/ui/CameraToolbar';
import { Global3DLoader } from '../../components/ui/Global3DLoader';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import {
  setupCables,
  setupIssues,
  setupConnectionIssue,
  type SetupCableId,
} from '../../domain/setup';
import type { CameraCommand } from '../../scene/CameraRig';
import type { PartId, CableId } from '../../domain/types';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { PcJourney } from '../../components/ui/PcJourney';
import type { Session, SessionAction } from '../../domain/session';
import { PcCompletion } from './PcCompletion';
import { SetupCableIcon, cableDescriptions } from './SetupCableIcon';

const SetupScene = lazy(() => import('../../scene/SetupScene'));

export function SetupWorkspace({
  internalComplete,
  powered,
  onPower,
  installed,
  internalConnected,
  session,
  dispatch,
  onReturn,
  onHome,
  onExplore,
  onRestart,
}: {
  session: Session;
  dispatch: Dispatch<SessionAction>;
  onReturn: () => void;
  onHome: () => void;
  onExplore: () => void;
  onRestart: () => void;
  internalComplete: boolean;
  powered: boolean;
  onPower: () => void;
  installed: PartId[];
  internalConnected: CableId[];
}) {
  const connected = session.setupConnected;
  const ready = internalComplete && session.caseClosed;
  const [pending, setPending] = useState<SetupCableId | null>(null);
  const pendingRef = useRef<SetupCableId | null>(null);
  const [message, setMessage] = useState('Conecta los perifÃ©ricos para terminar la estaciÃ³n.');
  const [camera, setCamera] = useState<CameraCommand>({
    action: 'reset',
    sequence: 0,
    target: [0, 0, 0],
  });
  const finishConnection = useCallback(() => {
    const id = pendingRef.current;
    if (!id) return;
    pendingRef.current = null;
    dispatch({ type: 'setup-cable', id });
    setPending(null);
    setMessage('Clavija insertada. ConexiÃ³n completada.');
  }, [dispatch]);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(
      finishConnection,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 5000,
    );
    return () => window.clearTimeout(timer);
  }, [pending, finishConnection]);
  function toggle(id: SetupCableId) {
    const issue = setupConnectionIssue(ready, powered, !!pending);
    if (issue) {
      setMessage(issue);
      if (!pending) dispatch({ type: 'setup-cable', id });
      return;
    }
    if (connected.includes(id)) dispatch({ type: 'setup-cable', id });
    else {
      pendingRef.current = id;
      setPending(id);
    }
    setMessage(connected.includes(id) ? 'Cable desconectado.' : 'Insertando la clavijaâ€¦');
  }
  function selectCable(id: SetupCableId) {
    if (pending) return;
    if (connected.includes(id)) {
      toggle(id);
      return;
    }
    toggle(id);
  }
  function start() {
    if (pending) {
      setMessage('Espera a que termine la conexiÃ³n.');
      return;
    }
    if (powered) {
      onPower();
      setMessage('PC apagada.');
      return;
    }
    const issues = setupIssues(ready, connected);
    if (issues.length) {
      onPower();
      setMessage(issues.join(' '));
      return;
    }
    onPower();
    setMessage('Conexiones comprobadas. Iniciando Windows 11â€¦');
  }
  function cameraAction(action: CameraCommand['action']) {
    setCamera((previous) => ({ action, sequence: previous.sequence + 1, target: [0, 0, 0] }));
  }
  function cableAction(id: SetupCableId) {
    if (pending === id) return 'Conectandoâ€¦';
    return connected.includes(id) ? 'Desconectar' : 'Conectar';
  }
  return (
    <section className="setup-workspace pc-phase">
      <SimulatorHeader
        title="Ensamblar PC"
        eyebrow={`EstaciÃ³n de trabajo Â· ${session.mode === 'learn' ? 'Aprender' : 'Practicar'}`}
        description="Conecta los perifÃ©ricos a la PC que acabas de ensamblar."
        mode={session.mode}
        disabled={!!pending}
        onMode={(mode) => dispatch({ type: 'mode', mode })}
        actions={
          <button className="button ghost" disabled={!!pending} onClick={onReturn}>
            Volver al ensamblaje
          </button>
        }
      >
        <PcJourney session={session} />
      </SimulatorHeader>
      {!ready && (
        <p className="notice" role="status">
          Completa los componentes y el cableado interno y cierra el gabinete para continuar.{' '}
          <button className="button" onClick={onReturn}>
            Ir al ensamblaje
          </button>
        </p>
      )}
      <PcCompletion session={session} onHome={onHome} onExplore={onExplore} onRestart={onRestart} />
      <div className="setup-layout">
        <section className="viewer setup-viewer">
          <div className="viewer-heading">
            <span>PC y perifÃ©ricos</span>
            <span>
              {connected.length}/{setupCables.length} conexiones
            </span>
          </div>
          <div className="canvas-container">
            <ErrorBoundary
              fallback={
                <div className="scene-fallback" role="alert">
                  La estaciÃ³n no pudo cargarse.{' '}
                  <button className="button" onClick={() => window.location.reload()}>
                    Reintentar
                  </button>
                </div>
              }
            >
              <Suspense fallback={<Global3DLoader variant="setup" />}>
                <SetupScene
                  connected={connected}
                  caseClosed={session.caseClosed}
                  powered={powered && setupIssues(ready, connected).length === 0}
                  booted={session.experienceCompleted}
                  camera={camera}
                  installed={installed}
                  internalConnected={internalConnected}
                  selected={null}
                  onConnect={toggle}
                  pending={pending}
                  onFinish={finishConnection}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
          <div className="viewer-toolbar">
            <CameraToolbar onAction={cameraAction} />
          </div>
        </section>
        <aside className="panel setup-panel">
          <h2>Conexiones</h2>
          <p className="connection-count">
            {connected.length} de {setupCables.length} completadas
          </p>
          <progress
            aria-label="Conexiones de estaciÃ³n"
            value={connected.length}
            max={setupCables.length}
          />
          <p>
            {powered
              ? 'PC encendida. Pulsa Â«Apagar PCÂ» para cambiar los cables.'
              : session.mode === 'learn'
                ? 'Conecta DisplayPort, la alimentaciÃ³n del monitor y de la PC, y los dos USB. DespuÃ©s comprueba y enciende.'
                : 'Completa las conexiones y comprueba tu estaciÃ³n. Los intentos de encendido incompletos se registran.'}
          </p>
          {setupCables.map((cable) => (
            <button
              key={cable.id}
              className={`part-card setup-connection ${
                connected.includes(cable.id) ? 'connected' : ''
              }`}
              disabled={powered || !!pending}
              onClick={() => selectCable(cable.id)}
              aria-pressed={connected.includes(cable.id)}
            >
              <SetupCableIcon id={cable.id} />
              <span className="setup-cable-copy">
                <strong>{cable.name}</strong>
                {session.mode === 'learn' && <small>{cableDescriptions[cable.id]}</small>}
                <span className={`badge ${connected.includes(cable.id) ? 'success' : ''}`}>
                  {connected.includes(cable.id)
                    ? 'âœ“ Conectado'
                    : pending === cable.id
                      ? 'Conectandoâ€¦'
                      : 'Pendiente'}
                </span>
              </span>
              <span className="setup-cable-action">{cableAction(cable.id)}</span>
            </button>
          ))}
          <button className="button primary" disabled={!!pending} onClick={start}>
            {powered ? 'Apagar PC' : 'Comprobar y encender'}
          </button>
          <p role="status">{session.messages.length ? session.messages.join(' ') : message}</p>
          {session.mode === 'practice' && (
            <p>
              Registro del recorrido: {session.errors} intentos no vÃ¡lidos Â· {session.hints}{' '}
              ayudas de montaje.
            </p>
          )}
          <button
            className="button ghost danger"
            disabled={powered || !!pending}
            onClick={() => {
              dispatch({ type: 'setup-clear' });
              setMessage('Conexiones externas reiniciadas.');
            }}
          >
            Desconectar todo
          </button>
        </aside>
      </div>
    </section>
  );
}
