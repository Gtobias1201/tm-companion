import { uid } from '../game/logic';

const CLIENT_ID_KEY = 'tm-companion:client-id';
const SESSION_KEY = 'tm-companion:session';

/** Última partida online a la que se unió este celular, para volver con un toque. */
export interface ClientSession {
  code: string;
  clientId: string;
  name: string;
}

/**
 * Identidad de esta pestaña como jugador invitado. Vive en sessionStorage para que dos
 * pestañas del mismo navegador sean jugadores distintos; para volver a una partida después
 * de cerrar el navegador se usa la sesión guardada.
 */
export function currentClientId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = uid();
    sessionStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return uid();
  }
}

/** Al volver a una partida guardada, esta pestaña retoma la identidad de ese jugador. */
export function rememberClientId(id: string) {
  try {
    sessionStorage.setItem(CLIENT_ID_KEY, id);
  } catch {
    // sin storage: la identidad dura lo que dure la pestaña
  }
}

export function loadClientSession(): ClientSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    return null;
  }
}

export function saveClientSession(session: ClientSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sin storage: no se podrá volver con un toque, pero sí con el código
  }
}

export function clearClientSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // nada que limpiar
  }
}
