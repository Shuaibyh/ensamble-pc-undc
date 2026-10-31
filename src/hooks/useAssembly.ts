import { useEffect, useReducer, useState } from 'react';
import { newSession, sessionReducer } from '../domain/session';
import { restoreSession, serializeSession, STORAGE_KEY } from '../state/storage';

export function useAssembly() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => {
    try {
      return restoreSession(
        localStorage.getItem(STORAGE_KEY),
        localStorage.getItem('ensamble-pc-undc:setup-v1'),
      );
    } catch {
      return newSession();
    }
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeSession(session));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [session]);
  useEffect(() => {
    if (!session.busy) return;
    const id = session.busy;
    // Bloqueo independiente de WebGL: también termina si el visor no está disponible.
    const timer = window.setTimeout(() => dispatch({ type: 'finish', id }), 15000);
    return () => window.clearTimeout(timer);
  }, [session.busy]);
  return { session, dispatch, saved };
}
