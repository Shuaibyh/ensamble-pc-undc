import type { Session } from '../../domain/session';
import { parts, cables } from '../../data/catalog';

export function EvaluationPanel({ session }: { session: Session }) {
  return (
    <section className="evaluation-panel">
      <div>
        <h2>{session.assembly.powered ? '✓ Encendido simulado correcto' : 'Tu práctica'}</h2>
        <p>
          Resultado sobre {parts.length} pasos y {cables.length} conexiones. Los errores y ayudas se
          muestran para que puedas mejorar el siguiente intento.
        </p>
      </div>
      <dl className="evaluation-stats">
        <div>
          <dt>Intentos no válidos</dt>
          <dd>{session.errors}</dd>
        </div>
        <div>
          <dt>Ayudas de práctica</dt>
          <dd>{session.hints}</dd>
        </div>
        <div>
          <dt>Instalaciones guiadas</dt>
          <dd>{session.guidedInstalls}</dd>
        </div>
        <div>
          <dt>Cambios de modo</dt>
          <dd>{session.modeChanges}</dd>
        </div>
      </dl>
      <p className="small muted">
        Es una evaluación educativa sin nota automática. Reiniciar comienza un ejercicio nuevo.
      </p>
      {session.log.length > 0 && (
        <details>
          <summary>Ver historial ({session.log.length})</summary>
          <ol>
            {session.log.map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
