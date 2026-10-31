import type { Part } from '../../domain/types';
import type { Session } from '../../domain/session';
import { installIssues, removeIssues } from '../../domain/assembly';

export function PartDetails({
  part,
  session,
  onInstall,
  onRemove,
  onLocate,
  locationVisible,
  manual = false,
  manipulating = false,
}: {
  part: Part;
  session: Session;
  onInstall: () => void;
  onRemove: () => void;
  onLocate: () => void;
  locationVisible: boolean;
  manual?: boolean;
  manipulating?: boolean;
}) {
  const installed = session.assembly.installed.includes(part.id);
  const issues = installed
    ? removeIssues(session.assembly, part.id)
    : installIssues(session.assembly, part.id);
  const disabled = !!session.busy || session.assembly.powered;
  return (
    <div className="details-content">
      <span className="eyebrow">{part.category} · Educativo</span>
      <h2>{part.name}</h2>
      <p className="detail-spec">{part.spec}</p>
      <p className="small muted">
        Montaje visual de tus archivos. No certifica compatibilidad física ni eléctrica.
      </p>
      <h3>¿Para qué sirve?</h3>
      <p>{part.description}</p>
      {(locationVisible || installed) && (
        <>
          <h3>Ubicación</h3>
          <p>{part.location}</p>
        </>
      )}
      <div className="detail-actions">
        <button
          className={installed ? 'button secondary' : 'button primary'}
          disabled={disabled || manipulating || (manual && !installed)}
          onClick={installed ? onRemove : onInstall}
        >
          {installed
            ? 'Retirar'
            : manual
              ? part.id === 'board-screws'
                ? 'Selecciona un punto en el visor'
                : 'Arrastra la tarjeta al visor'
              : part.id === 'paste'
                ? 'Aplicar pasta'
                : part.id === 'board-screws'
                  ? 'Atornillar'
                  : 'Instalar'}
        </button>
        <button className="button secondary" disabled={!!session.busy} onClick={onLocate}>
          Ver ubicación{session.mode === 'practice' ? ' · ayuda' : ''}
        </button>
      </div>
      {session.assembly.powered && (
        <p className="notice">Apaga la simulación antes de modificar piezas.</p>
      )}
      {session.mode === 'learn' && issues.length > 0 && (
        <div className="notice">
          <strong>Antes de continuar</strong>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted">
        {installed ? '✓ Pieza instalada.' : 'Pieza pendiente.'}{' '}
        {session.mode === 'practice'
          ? 'Los intentos no válidos se registran.'
          : 'El contorno azul indica dónde se coloca.'}
      </p>
    </div>
  );
}
