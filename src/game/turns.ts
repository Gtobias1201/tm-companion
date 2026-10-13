import type { Game } from './types';
import { log } from './log';
import { ACTIONS_PER_TURN } from './state';

export function countAction(g: Game, playerId: string) {
  if (!g.turn) return;
  g.turn.actions += 1;
  g.actionsThisGen[playerId] = (g.actionsThisGen[playerId] ?? 0) + 1;
  if (g.turn.actions >= ACTIONS_PER_TURN) advanceTurn(g, playerId, 'actions');
}

/** Pasa el turno al siguiente jugador (en orden) que todavía no pasó. */
export function advanceTurn(g: Game, fromId: string, reason: 'actions' | 'end' | 'pass') {
  const n = g.players.length;
  const from = g.players.findIndex((p) => p.id === fromId);
  g.turnNotice = { playerId: fromId, reason };
  for (let i = 1; i <= n; i++) {
    const next = g.players[(from + i) % n];
    if (!g.passed.includes(next.id)) {
      g.turn = { playerId: next.id, actions: 0 };
      g.activePlayerId = next.id;
      return;
    }
  }
  g.turn = null;
  log(g, 'Todos pasaron: toca la fase de producción');
}
