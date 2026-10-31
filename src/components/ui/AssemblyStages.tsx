export function AssemblyStages({ stages }: { stages: { name: string; completed: boolean }[] }) {
  const current = stages.findIndex((stage) => !stage.completed);
  return (
    <ol className="assembly-stages" aria-label="Etapas del montaje">
      {stages.map((stage, index) => (
        <li
          key={stage.name}
          className={stage.completed ? 'done' : index === current ? 'active' : ''}
          aria-current={index === current ? 'step' : undefined}
        >
          <span aria-hidden="true">{stage.completed ? '✓' : index + 1}</span>
          {stage.name}
          <span className="sr-only">
            : {stage.completed ? 'completada' : index === current ? 'en curso' : 'pendiente'}
          </span>
        </li>
      ))}
    </ol>
  );
}
