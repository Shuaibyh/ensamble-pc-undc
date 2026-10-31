import type { Session } from '../../domain/session';

export function PcCompletion({
  session,
  onHome,
  onExplore,
  onRestart,
}: {
  session: Session;
  onHome: () => void;
  onExplore: () => void;
  onRestart: () => void;
}) {
  if (!session.assembly.powered && !session.experienceCompleted) return null;
  return (
    <section className="pc-completion" aria-label="Encendido y resultado">
      <div
        className={`pc-desktop ${session.experienceCompleted ? 'ready' : 'booting'}`}
        role="img"
        aria-label={
          session.experienceCompleted
            ? 'Escritorio de Windows 11 simulado'
            : 'Arranque simulado de Windows 11'
        }
      >
        <span className="windows-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <strong>Windows 11</strong>
        <span>
          {session.experienceCompleted
            ? 'Escritorio listo · Simulación educativa'
            : 'Iniciando el sistema…'}
        </span>
        {session.experienceCompleted ? (
          <div className="pc-taskbar" aria-hidden="true">
            ⊞ &nbsp; ⌕ &nbsp; ▣
          </div>
        ) : (
          <span className="boot-spinner" aria-hidden="true" />
        )}
      </div>
      <div>
        <h2 role="status">
          {session.experienceCompleted ? '✓ Experiencia completada' : 'Arranque en curso'}
        </h2>
        <p>
          {session.experienceCompleted
            ? 'Completaste el ensamblaje, el cableado, el cierre y las conexiones de la estación.'
            : 'Las conexiones están comprobadas. Tu PC está iniciando Windows 11.'}
        </p>
        {session.experienceCompleted && (
          <div className="progress-actions">
            <button className="button primary" onClick={onHome}>
              Volver al inicio
            </button>
            <button className="button" onClick={onExplore}>
              Explorar modelos
            </button>
            <button className="button ghost" onClick={onRestart}>
              Reiniciar experiencia
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
