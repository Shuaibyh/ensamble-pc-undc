import type { Part } from './types';

// Solo compara tres etiquetas de la configuración educativa, no hardware universal.
export function specificationIssues(part: Part, installed: Part[]): string[] {
  const board = installed.find((item) => item.id === 'board');
  const cpu = installed.find((item) => item.id === 'cpu');
  if (
    part.id === 'cpu' &&
    board?.specifications.socket &&
    part.specifications.socket &&
    part.specifications.socket !== board.specifications.socket
  ) {
    return ['El socket del procesador no coincide con el de la placa madre.'];
  }
  if (
    part.id === 'cooler' &&
    cpu?.specifications.socket &&
    part.specifications.socket &&
    part.specifications.socket !== cpu.specifications.socket
  ) {
    return ['El anclaje del disipador no coincide con el socket del procesador.'];
  }
  if (
    part.id === 'ram' &&
    board?.specifications.memory &&
    part.specifications.memory &&
    part.specifications.memory !== board.specifications.memory
  ) {
    return ['La generación de RAM no coincide con la admitida por la placa madre.'];
  }
  return [];
}
