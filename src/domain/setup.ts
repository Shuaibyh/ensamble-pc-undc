export type SetupCableId = 'video' | 'monitor-power' | 'pc-power' | 'keyboard-usb' | 'mouse-usb';

export const setupCables: { id: SetupCableId; name: string }[] = [
  { id: 'video', name: 'DisplayPort: GPU → monitor' },
  { id: 'monitor-power', name: 'Alimentación del monitor' },
  { id: 'pc-power', name: 'Alimentación de la fuente de la PC' },
  { id: 'keyboard-usb', name: 'USB del teclado' },
  { id: 'mouse-usb', name: 'USB del mouse' },
];

export function setupIssues(internalComplete: boolean, connected: SetupCableId[]) {
  return [
    ...(internalComplete ? [] : ['Completa primero el montaje interno y todas sus conexiones.']),
    ...setupCables
      .filter((cable) => !connected.includes(cable.id))
      .map((cable) => `Falta conectar: ${cable.name}.`),
  ];
}

export function toggleSetupCable(connected: SetupCableId[], id: SetupCableId) {
  return connected.includes(id) ? connected.filter((item) => item !== id) : [...connected, id];
}

export function setupConnectionIssue(internalComplete: boolean, powered: boolean, busy: boolean) {
  if (busy) return 'Espera a que termine la conexión.';
  if (powered) return 'Apaga la PC antes de cambiar conexiones.';
  if (!internalComplete) return 'Completa primero el montaje interno.';
  return null;
}
