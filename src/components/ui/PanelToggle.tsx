export function PanelToggle({
  open,
  panel,
  label,
  onToggle,
}: {
  open: boolean;
  panel: string;
  label: string;
  onToggle: () => void;
}) {
  const action = `${open ? 'Plegar' : 'Mostrar'} ${label.toLowerCase()}`;
  return (
    <button
      className={`button panel-handle ${open ? 'icon ghost' : 'secondary'}`}
      title={action}
      aria-label={action}
      aria-expanded={open}
      aria-controls={panel}
      onClick={() => {
        onToggle();
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLButtonElement>(`button[aria-controls="${panel}"]`)
            ?.focus({ preventScroll: true }),
        );
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d={open ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'} />
      </svg>
      {!open && label}
    </button>
  );
}
