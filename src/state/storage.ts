import { parts, cables } from '../data/catalog';
import { actionIssues, newSession, type Session } from '../domain/session';
import { transition } from '../domain/assembly';
import { powerIssues } from '../domain/assembly';
import { setupCables } from '../domain/setup';

export const STORAGE_KEY = 'ensamble-pc-undc:creagal-v1';
export function serializeSession(session: Session): string {
  return JSON.stringify({
    version: 4,
    session: {
      ...session,
      busy: null,
      messages: [],
      assembly: { ...session.assembly, powered: false },
    },
  });
}
// Nunca confiamos en el almacenamiento: reconstruimos el montaje con las mismas reglas.
export function restoreSession(raw: string | null, legacySetup: string | null = null): Session {
  if (!raw) return newSession();
  try {
    const saved = JSON.parse(raw);
    if (![2, 3, 4].includes(saved.version) || !saved.session) return newSession();
    const data = saved.session;
    let restored = newSession(data.mode === 'practice' ? 'practice' : 'learn');
    if (!Array.isArray(data.assembly?.installed) || !Array.isArray(data.assembly?.connected))
      return restored;
    const wanted = new Set(data.assembly.installed);
    // El montaje antiguo asumía soportes, tornillos y pasta. Conservar ese progreso,
    // pero nunca dar por instalados los nuevos ventiladores.
    if (saved.version === 2 && wanted.has('board')) {
      wanted.add('standoffs');
      wanted.add('board-screws');
      if (wanted.has('cooler')) wanted.add('paste');
    }
    for (let pass = 0; pass < parts.length; pass++) {
      for (const part of parts) {
        const action = { type: 'install' as const, id: part.id };
        if (wanted.has(part.id) && !actionIssues(restored.assembly, action).length)
          restored.assembly = transition(restored.assembly, action);
      }
    }
    for (const cable of cables) {
      const action = { type: 'connect' as const, id: cable.id };
      if (
        data.assembly.connected.includes(cable.id) &&
        !actionIssues(restored.assembly, action).length
      )
        restored.assembly = transition(restored.assembly, action);
    }
    for (const key of ['errors', 'hints', 'guidedInstalls', 'modeChanges'] as const) {
      restored[key] = Number.isSafeInteger(data[key]) && data[key] >= 0 ? data[key] : 0;
    }
    restored = {
      ...restored,
      log: Array.isArray(data.log)
        ? data.log
            .filter((item: unknown) => typeof item === 'string')
            .slice(-30)
            .map((item: string) => item.slice(0, 1000))
        : [],
    };
    const internalComplete = powerIssues(restored.assembly).length === 0;
    restored.caseClosed = internalComplete && saved.version === 4 && data.caseClosed === true;
    let setup: unknown = data.setupConnected;
    if (saved.version < 4 && legacySetup) {
      try {
        setup = JSON.parse(legacySetup);
      } catch {
        setup = [];
      }
    }
    restored.setupConnected = setupCables
      .filter(({ id }) => Array.isArray(setup) && setup.includes(id))
      .map(({ id }) => id);
    restored.experienceCompleted =
      restored.caseClosed &&
      restored.setupConnected.length === setupCables.length &&
      data.experienceCompleted === true;
    return restored;
  } catch {
    return newSession();
  }
}
