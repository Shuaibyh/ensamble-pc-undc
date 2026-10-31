import { useState } from 'react';
import { categoriesList, parts } from '../../data/catalog';
import type { Assembly } from '../../domain/assembly';
import type { PartId } from '../../domain/types';

export function CatalogPanel({
  assembly,
  selected,
  disabled,
  onSelect,
  dragEnabled = false,
  onDragStart,
  onDragEnd,
}: {
  assembly: Assembly;
  selected: PartId;
  disabled: boolean;
  onSelect: (id: PartId) => void;
  dragEnabled?: boolean;
  onDragStart?: (id: PartId) => void;
  onDragEnd?: () => void;
}) {
  const [category, setCategory] = useState('Todas');
  return (
    <div className="catalog-content">
      {dragEnabled && (
        <p className="small muted">
          Arrastra una tarjeta al visor, mueve y gira la pieza. Pulsa Insertar al alinearla. Para
          los tornillos: selecciona su punto en el visor y pulsa Insertar.
        </p>
      )}
      <label className="field-label" htmlFor="category">
        Categoría
      </label>
      <select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
        {categoriesList.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <div className="catalog-list">
        {parts
          .filter((part) => category === 'Todas' || part.category === category)
          .map((part) => {
            const installed = assembly.installed.includes(part.id);
            return (
              <button
                key={part.id}
                data-part={part.id}
                className={`part-card ${selected === part.id ? 'selected' : ''}`}
                aria-pressed={selected === part.id}
                disabled={disabled}
                onClick={() => onSelect(part.id)}
                draggable={
                  dragEnabled &&
                  !installed &&
                  !disabled &&
                  !['paste', 'board-screws'].includes(part.id)
                }
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', 'pc:' + part.id);
                  event.dataTransfer.effectAllowed = 'move';
                  onDragStart?.(part.id);
                }}
                onDragEnd={onDragEnd}
              >
                <img
                  draggable={false}
                  src={part.asset.thumbnailPath}
                  alt=""
                  width={76}
                  height={62}
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                  }}
                />
                <span>
                  <strong>{part.name}</strong>
                  <small>{part.spec}</small>
                  <span className={installed ? 'badge success' : 'badge'}>
                    {installed ? '✓ Instalada' : 'Disponible'}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
      <div className="catalog-note">
        <strong>Base del ejercicio</strong>
        <img src="/thumbnails/case.svg" alt="Gabinete educativo" width={66} height={66} />
        <p>Gabinete vacío: instala también separadores, fijaciones y ventiladores.</p>
        <small>Modelos genéricos educativos. No representan productos comerciales exactos.</small>
      </div>
    </div>
  );
}
