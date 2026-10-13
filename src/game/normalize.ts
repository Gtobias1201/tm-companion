import { DEFAULT_CARD_COST, DEFAULT_STEEL_VALUE, DEFAULT_TITANIUM_VALUE } from './constants';
import { emptyScore } from './scoring';
import { firstPlayer } from './state';
import type { Game } from './types';

/** Completa campos agregados en versiones nuevas para partidas guardadas antes. */
export function normalizeGame(g: Game): Game {
  for (const p of g.players) {
    p.steelValue ??= DEFAULT_STEEL_VALUE;
    p.titaniumValue ??= DEFAULT_TITANIUM_VALUE;
    p.discounts ??= [];
    p.cardCost ??= DEFAULT_CARD_COST;
    p.corporationId ??= null;
    p.score = { ...emptyScore(), ...p.score };
  }
  // turn puede ser null a propósito (todos pasaron); solo se completa si falta el campo
  if (g.turn === undefined) g.turn = { playerId: firstPlayer(g).id, actions: 0 };
  g.passed ??= [];
  g.actionsThisGen ??= {};
  g.turnNotice ??= null;
  g.researchPending ??= false;
  g.options.prelude ??= false;
  g.reminder ??= null;
  g.options.board ??= 'tharsis';
  g.milestones ??= [];
  g.awards ??= [];
  g.phase ??= 'playing';
  g.awardValues ??= {};
  g.researchDone ??= [];
  return g;
}
