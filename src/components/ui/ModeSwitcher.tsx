import type { Mode } from '../../domain/session';

export function ModeSwitcher({
  mode,
  disabled = false,
  onChange,
}: {
  mode: Mode;
  disabled?: boolean;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="mode-control">
      <div className="mode-switch" role="group" aria-label="Modo de aprendizaje">
        <button
          disabled={disabled}
          aria-pressed={mode === 'learn'}
          onClick={() => onChange('learn')}
        >
          Aprender
        </button>
        <button
          disabled={disabled}
          aria-pressed={mode === 'practice'}
          onClick={() => onChange('practice')}
        >
          Practicar
        </button>
      </div>
      <small>
        {mode === 'learn'
          ? 'Explicaciones y pistas disponibles'
          : 'Ayudas a pedido · intentos registrados'}
      </small>
    </div>
  );
}
