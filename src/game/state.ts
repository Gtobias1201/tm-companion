import { LIMITS, RESEARCH_CARDS, SOLO_GENERATIONS } from './constants';
import { RESOURCES, type Game, type Player, type ResourceKey, type ResourceMap } from './types';
import { filled } from './util';

/** Consultas sobre el estado de la partida (no la modifican). */

export const ACTIONS_PER_TURN = 2;

export const productionMin = (key: ResourceKey) => (key === 'megacredits' ? -5 : 0);

export const isSolo = (g: Game) => g.players.length === 1;

export const firstPlayer = (g: Game) => g.players[(g.generation - 1) % g.players.length];

export function isTerraformed(g: Game): boolean {
  const { temperature, oxygen, oceans } = g.globals;
  return temperature >= LIMITS.temperature.max && oxygen >= LIMITS.oxygen.max && oceans >= LIMITS.oceans.max;
}

/** Durante la fase de investigación nadie puede hacer acciones todavía. */
export const isTurnOf = (g: Game, playerId: string) =>
  g.phase === 'playing' && !g.researchPending && g.turn?.playerId === playerId;

/** La partida termina al final de la generación en que se completa la terraformación. */
export const isLastGeneration = (g: Game) => isTerraformed(g) || (isSolo(g) && g.generation >= SOLO_GENERATIONS);

/** En solitario se gana si Marte (y Venus, con Venus Next) quedó terraformado. */
export const soloWon = (g: Game) => isTerraformed(g) && (!g.options.venus || g.globals.venus >= LIMITS.venus.max);

/** Cuántas cartas puede comprar el jugador en la fase de investigación. */
export const maxCardsToBuy = (p: Player) =>
  Math.min(RESEARCH_CARDS, p.cardCost > 0 ? Math.floor(p.resources.megacredits / p.cardCost) : RESEARCH_CARDS);

/** Ganancias que recibirá el jugador en la fase de producción. */
export function productionPreview(p: Player): ResourceMap {
  const gains = filled(0);
  for (const k of RESOURCES) gains[k] = Math.max(0, p.production[k]);
  gains.megacredits = p.tr + p.production.megacredits;
  gains.heat += p.resources.energy;
  gains.energy = p.production.energy - p.resources.energy;
  return gains;
}
