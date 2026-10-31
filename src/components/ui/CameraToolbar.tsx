import type { ReactNode } from 'react';

export type CameraAction = 'left' | 'right' | 'in' | 'out' | 'reset' | 'focus';
const icons: Record<CameraAction, ReactNode> = {
  left: <path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14" />,
  right: <path d="m16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14" />,
  in: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M7 10h6m-3-3v6" />
    </>
  ),
  out: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M7 10h6" />
    </>
  ),
  reset: (
    <>
      <path d="M4 9a8 8 0 1 1 0 7M4 3v6h6" />
    </>
  ),
  focus: (
    <>
      <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};
const labels: Record<CameraAction, string> = {
  left: 'Girar a la izquierda',
  right: 'Girar a la derecha',
  in: 'Acercar',
  out: 'Alejar',
  reset: 'Restablecer vista',
  focus: 'Enfocar pieza',
};

export function CameraToolbar({
  onAction,
  focus = false,
  disabled = false,
  children,
}: {
  onAction: (action: CameraAction) => void;
  focus?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="camera-toolbar" role="group" aria-label="Controles de cámara">
      {(['left', 'right', 'in', 'out', 'reset', ...(focus ? ['focus'] : [])] as CameraAction[]).map(
        (action) => (
          <button
            key={action}
            className={`button ${action === 'reset' || action === 'focus' ? 'secondary' : 'icon secondary'}`}
            title={labels[action]}
            aria-label={labels[action]}
            disabled={disabled}
            onClick={() => onAction(action)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {icons[action]}
            </svg>
            {(action === 'reset' || action === 'focus') && labels[action]}
          </button>
        ),
      )}
      {children}
    </div>
  );
}
