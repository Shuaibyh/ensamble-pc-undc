import type { SetupCableId } from '../../domain/setup';

export const cableDescriptions: Record<SetupCableId, string> = {
  video: 'Lleva la imagen de la tarjeta gráfica al monitor.',
  'monitor-power': 'Suministra energía a la pantalla.',
  'pc-power': 'Suministra energía a la fuente de alimentación.',
  'keyboard-usb': 'Permite escribir y enviar comandos a la PC.',
  'mouse-usb': 'Permite mover el puntero y seleccionar.',
};

export function SetupCableIcon({ id }: { id: SetupCableId }) {
  return (
    <svg
      className="setup-cable-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {id === 'video' ? (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M12 16v4m-4 0h8" />
        </>
      ) : id === 'keyboard-usb' ? (
        <>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h1m4 0h1m4 0h1M6 14h12" />
        </>
      ) : id === 'mouse-usb' ? (
        <>
          <rect x="6" y="2" width="12" height="20" rx="6" />
          <path d="M12 2v7m-6 1h12" />
        </>
      ) : (
        <>
          <path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0zm6 9v5" />
        </>
      )}
    </svg>
  );
}
