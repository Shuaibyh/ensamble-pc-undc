import { cables, parts } from '../data/catalog';
import {
  emptyAssembly,
  installIssues,
  powerIssues,
  removeIssues,
  transition,
  type Action,
  type Assembly,
} from './assembly';
import type { PartId } from './types';
import { setupCables, setupIssues, toggleSetupCable, type SetupCableId } from './setup';

export type Mode = 'learn' | 'practice';
export interface Session {
  assembly: Assembly;
  mode: Mode;
  busy: PartId | null;
  errors: number;
  hints: number;
  guidedInstalls: number;
  modeChanges: number;
  log: string[];
  messages: string[];
  caseClosed: boolean;
  setupConnected: SetupCableId[];
  experienceCompleted: boolean;
}
export function newSession(mode: Mode = 'learn'): Session {
  return {
    assembly: emptyAssembly(),
    mode,
    busy: null,
    errors: 0,
    hints: 0,
    guidedInstalls: 0,
    modeChanges: 0,
    log: [],
    messages: [],
    caseClosed: false,
    setupConnected: [],
    experienceCompleted: false,
  };
}
export function actionIssues(assembly: Assembly, action: Action): string[] {
  if (action.type === 'off' || action.type === 'reset') return [];
  if (assembly.powered) return ['Apaga la PC antes de modificar el montaje.'];
  if (action.type === 'power') return powerIssues(assembly);
  if (action.type === 'install') {
    if (assembly.installed.includes(action.id)) return ['Esta pieza ya está instalada.'];
    return installIssues(assembly, action.id);
  }
  if (action.type === 'remove') {
    if (!assembly.installed.includes(action.id)) return ['Esta pieza todavía no está instalada.'];
    return removeIssues(assembly, action.id);
  }
  if (action.type === 'connect') {
    const cable = cables.find((item) => item.id === action.id)!;
    if (assembly.connected.includes(action.id)) return ['Este cable ya está conectado.'];
    return cable.depends
      .filter((id) => !assembly.installed.includes(id))
      .map((id) => `Instala primero la pieza: ${parts.find((part) => part.id === id)!.name}.`);
  }
  return [];
}
export type SessionAction =
  | { type: 'command'; action: Action }
  | { type: 'mode'; mode: Mode }
  | { type: 'hint'; name: string }
  | { type: 'finish'; id: PartId }
  | { type: 'case'; closed: boolean }
  | { type: 'setup-cable'; id: SetupCableId }
  | { type: 'setup-clear' }
  | { type: 'setup-power' }
  | { type: 'boot-complete' }
  | { type: 'check' };
function recordError(session: Session, issues: string[]): Session {
  if (session.mode === 'learn') return { ...session, messages: issues };
  return {
    ...session,
    messages: issues,
    errors: session.errors + 1,
    log: [...session.log, `Intento no válido: ${issues.join(' ')}`].slice(-30),
  };
}
export function sessionReducer(session: Session, event: SessionAction): Session {
  if (event.type === 'finish')
    return session.busy === event.id ? { ...session, busy: null } : session;
  if (session.busy) return { ...session, messages: ['Espera a que termine la instalación.'] };
  const internalComplete = powerIssues(session.assembly).length === 0;
  if (event.type === 'case') {
    if (session.assembly.powered)
      return recordError(session, ['Apaga la PC antes de abrir el gabinete.']);
    if (event.closed && !internalComplete)
      return recordError(session, ['Completa el montaje y el cableado interno antes del cierre.']);
    return {
      ...session,
      caseClosed: event.closed,
      experienceCompleted: event.closed && session.experienceCompleted,
      messages: [],
    };
  }
  if (event.type === 'setup-cable' || event.type === 'setup-clear') {
    if (session.assembly.powered)
      return recordError(session, ['Apaga la PC antes de cambiar conexiones.']);
    if (event.type === 'setup-cable' && (!internalComplete || !session.caseClosed))
      return recordError(session, ['Completa el montaje interno y cierra el gabinete.']);
    return {
      ...session,
      setupConnected:
        event.type === 'setup-clear' ? [] : toggleSetupCable(session.setupConnected, event.id),
      experienceCompleted: false,
      messages: [],
    };
  }
  if (event.type === 'setup-power') {
    if (session.assembly.powered)
      return { ...session, assembly: transition(session.assembly, { type: 'off' }), messages: [] };
    const issues = [
      ...setupIssues(internalComplete, session.setupConnected),
      ...(session.caseClosed ? [] : ['Cierra el gabinete antes de encender.']),
    ];
    return issues.length
      ? recordError(session, issues)
      : {
          ...session,
          assembly: transition(session.assembly, { type: 'power' }),
          experienceCompleted: false,
          messages: [],
        };
  }
  if (event.type === 'boot-complete') {
    return session.assembly.powered &&
      session.caseClosed &&
      internalComplete &&
      setupCables.every(({ id }) => session.setupConnected.includes(id))
      ? { ...session, experienceCompleted: true }
      : session;
  }
  if (event.type === 'mode')
    return event.mode === session.mode
      ? session
      : { ...session, mode: event.mode, modeChanges: session.modeChanges + 1, messages: [] };
  if (event.type === 'hint') {
    const practice = session.mode === 'practice';
    return {
      ...session,
      hints: session.hints + Number(practice),
      log: practice
        ? [...session.log, `Ayuda utilizada: ubicación de ${event.name}.`].slice(-30)
        : session.log,
      messages: [`Ayuda de ubicación utilizada: ${event.name}.`],
    };
  }
  if (event.type === 'check') {
    const issues = powerIssues(session.assembly);
    return issues.length
      ? recordError(session, issues)
      : {
          ...session,
          messages: [
            `Montaje completo: ${parts.length} piezas y pasos, ${cables.length} conexiones verificadas. Cierra el gabinete y continúa a la estación.`,
          ],
        };
  }
  if (event.action.type === 'reset') return newSession(session.mode);
  const issues = actionIssues(session.assembly, event.action);
  if (issues.length) return recordError(session, issues);
  const installing = event.action.type === 'install';
  return {
    ...session,
    assembly: transition(session.assembly, event.action),
    ...(!['power', 'off'].includes(event.action.type)
      ? { caseClosed: false, experienceCompleted: false }
      : {}),
    busy: event.action.type === 'install' ? event.action.id : null,
    guidedInstalls: session.guidedInstalls + Number(installing && session.mode === 'learn'),
    messages: [],
  };
}
