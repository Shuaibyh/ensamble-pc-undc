import { parts, cables } from '../../data/catalog';
import { setupCables } from '../../domain/setup';
import type { Session } from '../../domain/session';
import { AssemblyStages } from './AssemblyStages';

export function PcJourney({ session }: { session: Session }) {
  const assembly = session.assembly.installed.length === parts.length;
  const wiring = assembly && session.assembly.connected.length === cables.length;
  const closed = wiring && session.caseClosed;
  return (
    <AssemblyStages
      stages={[
        { name: 'Ensamblaje', completed: assembly },
        { name: 'Cableado interno', completed: wiring },
        { name: 'Cierre', completed: closed },
        {
          name: 'Estación de trabajo',
          completed: closed && session.setupConnected.length === setupCables.length,
        },
        { name: 'Encendido', completed: session.experienceCompleted },
      ]}
    />
  );
}
