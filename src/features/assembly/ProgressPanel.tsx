import { parts, cables } from '../../data/catalog';
import { installIssues } from '../../domain/assembly';
import type { Session } from '../../domain/session';

export function ProgressPanel({
  session,
  caseClosed,
  closurePending = false,
  onToggleCase,
  onCheck,
  onContinue,
}: {
  session: Session;
  caseClosed: boolean;
  closurePending?: boolean;
  onToggleCase: () => void;
  onCheck: () => void;
  onContinue: () => void;
}) {
  const { assembly } = session;
  const done = assembly.installed.length + assembly.connected.length;
  const next = parts.find(
    (part) => !assembly.installed.includes(part.id) && !installIssues(assembly, part.id).length,
  );
  let instruction = 'Comprueba tus componentes y sus conexiones.';
  if (session.mode === 'learn')
    instruction = next
      ? `Siguiente paso sugerido: instala ${next.name.toLowerCase()}.`
      : 'Conecta la alimentación y comprueba el montaje.';
  if (done === parts.length + cables.length)
    instruction = caseClosed
      ? 'Ensamblaje interno completado. La PC está lista para preparar la estación de trabajo.'
      : 'Montaje interno completo. Ahora cierra y asegura el gabinete.';
  if (session.busy) instruction = 'Instalando… Espera a que termine la animación.';
  if (closurePending)
    instruction = 'Panel colocado. Selecciona e inserta todos sus tornillos para continuar.';
  return (
    <section className="progress-panel" aria-label="Progreso del ensamblaje">
      <div className="progress-summary">
        <strong>
          {Math.round(((done + Number(caseClosed)) / (parts.length + cables.length + 1)) * 100)}%
          del montaje interno
        </strong>
        <span>
          {assembly.installed.length}/{parts.length} piezas y pasos · {assembly.connected.length}/
          {cables.length} conexiones
        </span>
        <progress
          aria-label="Progreso del montaje interno"
          max={parts.length + cables.length + 1}
          value={done + Number(caseClosed)}
        />
      </div>
      <p aria-live="polite">{instruction}</p>
      <div className="progress-actions">
        <button className="button" disabled={!!session.busy} onClick={onCheck}>
          Comprobar montaje
        </button>
        {done === parts.length + cables.length && (
          <button
            className={`button ${caseClosed ? 'success-button' : 'primary'}`}
            disabled={!!session.busy || assembly.powered}
            onClick={onToggleCase}
          >
            {caseClosed
              ? '✓ Cerrado · abrir gabinete'
              : closurePending
                ? 'Cancelar cierre'
                : 'Colocar panel y seleccionar tornillos'}
          </button>
        )}
        <button
          className="button primary"
          disabled={!!session.busy || !caseClosed || done !== parts.length + cables.length}
          onClick={onContinue}
          title={caseClosed ? undefined : 'Cierra primero el gabinete'}
        >
          Continuar a conexión de estación →
        </button>
      </div>
    </section>
  );
}
