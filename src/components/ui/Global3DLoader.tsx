type LoaderVariant = 'pc' | 'laptop' | 'library' | 'setup' | 'model';

const copy: Record<LoaderVariant, { title: string; status: string; tip: string }> = {
  pc: {
    title: 'Laboratorio 3D UNDC',
    status: 'Preparando ensamblador de PC...',
    tip: 'Tip: las piezas correctas encajan automaticamente.',
  },
  laptop: {
    title: 'Laboratorio 3D UNDC',
    status: 'Cargando teclado, pantalla y bateria...',
    tip: 'Tip: en modo aprender veras pistas y explicaciones.',
  },
  library: {
    title: 'Visor de modelos 3D',
    status: 'Aplicando materiales y geometria...',
    tip: 'Tip: arrastra para rotar el modelo.',
  },
  setup: {
    title: 'Estacion de trabajo',
    status: 'Cargando conexiones y perifericos...',
    tip: 'Tip: usa acercar para inspeccionar conectores.',
  },
  model: {
    title: 'Modelo interactivo',
    status: 'Cargando modelo y texturas...',
    tip: 'Tip: usa acercar/alejar para revisar detalles.',
  },
};

export function Global3DLoader({
  variant = 'model',
  status,
  compact = false,
}: {
  variant?: LoaderVariant;
  status?: string;
  compact?: boolean;
}) {
  const content = copy[variant];
  return (
    <div
      className={`global-3d-loader ${compact ? 'compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loader-emblem" aria-hidden="true">
        <span />
        <img src="/branding/logo-facultad.png" alt="" />
      </div>
      <strong>{content.title}</strong>
      <p>{status || content.status}</p>
      <div className="loader-progress" aria-hidden="true">
        <i />
      </div>
      <small>{content.tip}</small>
    </div>
  );
}
