import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { viewPaths, type AppView, type HomeSection } from '../../navigation';

const modules = [
  ['assembly', 'Ensamblar PC', 'Ensamblaje, conexiones y encendido'],
  ['laptop', 'Ensamblar laptop', 'Interior, conexiones y cierre'],
  ['fans', 'Ventiladores ARGB (Beta)', 'Arrastre, fijaciones y vista RGB'],
  ['library', 'Explorar modelos', 'Recursos, autores y licencias'],
] as const;
const sections: [HomeSection, string][] = [
  ['proyecto', 'Proyecto'],
  ['facultad', 'Institución'],
  ['equipo', 'Equipo'],
  ['creditos', 'Créditos'],
];

export function PrimaryNavigation({
  view,
  section,
  onOpen,
  onSection,
}: {
  view: AppView;
  section?: HomeSection;
  onOpen: (view: AppView) => void;
  onSection: (section: HomeSection) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  function move(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
    requestAnimationFrame(() => {
      const links = [
        ...(root.current?.querySelectorAll<HTMLAnchorElement>('.simulator-dropdown a') ?? []),
      ];
      const index = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? links.length - 1
            : event.key === 'ArrowDown'
              ? (index + 1) % links.length
              : index < 0
                ? links.length - 1
                : (index - 1 + links.length) % links.length;
      links[next]?.focus();
    });
  }
  return (
    <nav className="primary-nav" aria-label="Navegación principal">
      <button
        className="nav-link"
        aria-current={view === 'home' && !section ? 'page' : undefined}
        onClick={() => {
          setOpen(false);
          onOpen('home');
        }}
      >
        Inicio
      </button>
      <div
        className="simulator-menu"
        ref={root}
        onKeyDown={move}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <button
          ref={trigger}
          className="nav-link simulator-trigger"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="simulator-dropdown"
          data-active={view !== 'home'}
          onClick={() => setOpen(!open)}
        >
          Simuladores
          <span className="nav-chevron" aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <div className="simulator-dropdown" id="simulator-dropdown" role="menu">
            {modules.map(([id, title, description]) => (
              <a
                key={id}
                href={viewPaths[id]}
                role="menuitem"
                aria-current={
                  view === id || (view === 'setup' && id === 'assembly') ? 'page' : undefined
                }
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  setOpen(false);
                  onOpen(id);
                }}
              >
                <strong>{title}</strong>
                <small>{description}</small>
              </a>
            ))}
          </div>
        )}
      </div>
      {sections.map(([id, label]) => (
        <button
          key={id}
          className="nav-link"
          aria-current={view === 'home' && section === id ? 'page' : undefined}
          onClick={() => {
            setOpen(false);
            onSection(id);
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
