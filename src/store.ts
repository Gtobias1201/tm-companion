import { applyAction, normalizeGame, type Action } from './game/logic';
import type { Game } from './game/types';

const STORAGE_KEY = 'tm-companion:v1';
const UNDO_LIMIT = 50;

export interface AppState {
  games: Record<string, Game>;
  currentId: string | null;
  /** Historial para deshacer; solo vive en memoria. */
  undo: Record<string, Game[]>;
}

export type AppAction =
  | { type: 'create'; game: Game }
  | { type: 'open'; id: string }
  | { type: 'close' }
  | { type: 'delete'; id: string }
  | { type: 'game'; action: Action }
  | { type: 'undo' };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Pick<AppState, 'games' | 'currentId'>;
      const games = saved.games ?? {};
      Object.values(games).forEach(normalizeGame);
      const currentId = saved.currentId && games[saved.currentId] ? saved.currentId : null;
      return { games, currentId, undo: {} };
    }
  } catch {
    // datos corruptos o storage bloqueado: arrancamos vacío
  }
  return { games: {}, currentId: null, undo: {} };
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ games: state.games, currentId: state.currentId }));
  } catch {
    // sin espacio o modo privado: la partida sigue en memoria
  }
}

export function appReducer(s: AppState, a: AppAction): AppState {
  switch (a.type) {
    case 'create':
      return { ...s, games: { ...s.games, [a.game.id]: a.game }, currentId: a.game.id };

    case 'open':
      return s.games[a.id] ? { ...s, currentId: a.id } : s;

    case 'close':
      return { ...s, currentId: null };

    case 'delete': {
      const games = { ...s.games };
      const undo = { ...s.undo };
      delete games[a.id];
      delete undo[a.id];
      return { games, undo, currentId: s.currentId === a.id ? null : s.currentId };
    }

    case 'game': {
      if (!s.currentId) return s;
      const game = s.games[s.currentId];
      const next = applyAction(game, a.action);
      if (next === game) return s;
      // cambiar de jugador no merece un paso de "deshacer"
      const undo =
        a.action.type === 'setActive'
          ? s.undo
          : { ...s.undo, [game.id]: [...(s.undo[game.id] ?? []), game].slice(-UNDO_LIMIT) };
      return { ...s, games: { ...s.games, [game.id]: next }, undo };
    }

    case 'undo': {
      if (!s.currentId) return s;
      const stack = s.undo[s.currentId] ?? [];
      const prev = stack[stack.length - 1];
      if (!prev) return s;
      return {
        ...s,
        games: { ...s.games, [prev.id]: prev },
        undo: { ...s.undo, [prev.id]: stack.slice(0, -1) },
      };
    }
  }
}
