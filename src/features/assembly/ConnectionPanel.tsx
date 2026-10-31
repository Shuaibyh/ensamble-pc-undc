import { cables, parts } from '../../data/catalog';
import type { Assembly } from '../../domain/assembly';
import type { CableId } from '../../domain/types';

export function ConnectionPanel({
  assembly,
  disabled,
  onToggle,
}: {
  assembly: Assembly;
  disabled: boolean;
  onToggle: (id: CableId) => void;
}) {
  return (
    <section className="connection-panel">
      <h3>Alimentación</h3>
      <p className="small muted">Usa estos botones o los puntos del visor.</p>
      {cables.map((cable) => {
        const connected = assembly.connected.includes(cable.id);
        const missing = cable.depends.filter((id) => !assembly.installed.includes(id));
        return (
          <div className="connection-row" key={cable.id}>
            <div>
              <strong>{cable.name}</strong>
              <small>{connected ? '✓ Conectado' : 'Sin conectar'}</small>
            </div>
            <button
              className="button compact"
              aria-label={`${connected ? 'Desconectar' : 'Conectar'} ${cable.name}`}
              disabled={disabled}
              onClick={() => onToggle(cable.id)}
            >
              {connected ? 'Desconectar' : 'Conectar'}
            </button>
            {missing.length > 0 && (
              <p>
                Requiere:{' '}
                {missing.map((id) => parts.find((part) => part.id === id)!.name).join(', ')}.
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
