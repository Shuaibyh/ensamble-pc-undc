import type { ReactNode } from 'react';
import type { Mode } from '../../domain/session';
import { ModeSwitcher } from './ModeSwitcher';

export function SimulatorHeader({
  title,
  description,
  eyebrow,
  mode,
  onMode,
  disabled,
  actions,
  children,
}: {
  title: string;
  description: string;
  eyebrow: string;
  mode?: Mode;
  onMode?: (mode: Mode) => void;
  disabled?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="simulator-header">
      <div className="simulator-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {mode && onMode && <ModeSwitcher mode={mode} onChange={onMode} disabled={disabled} />}
      </div>
      <div className="simulator-flow">
        {children}
        <div className="simulator-actions">{actions}</div>
      </div>
    </header>
  );
}
