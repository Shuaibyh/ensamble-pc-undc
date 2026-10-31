import { Html } from '@react-three/drei';
import type { Vec3 } from '../domain/types';
import './assemblyDropTarget.css';

/** A large drop surface anchored to the real assembly location, including screw groups. */
export function AssemblyDropTarget({
  position,
  token,
  name,
  active,
  blocked,
  onPlace,
}: {
  position: Vec3;
  token: string;
  name: string;
  active: boolean;
  blocked: string;
  onPlace: () => void;
}) {
  return (
    <Html position={position} center zIndexRange={[30, 20]}>
      <div
        className={`assembly-drop-target ${active ? 'active' : ''} ${blocked ? 'blocked' : ''}`}
        data-assembly-drop={token}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = blocked ? 'none' : 'move';
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!blocked && event.dataTransfer.getData('text/plain') === token) onPlace();
        }}
      >
        <span aria-hidden="true">◎</span>
        <strong>{name}</strong>
        <small>
          {blocked ||
            (active ? 'Suelta aquí para colocar' : 'Ubicación · arrastra aquí la tarjeta')}
        </small>
      </div>
    </Html>
  );
}
