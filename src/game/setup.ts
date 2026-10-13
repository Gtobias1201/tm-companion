import {
  DEFAULT_CARD_COST,
  DEFAULT_GREENERY_COST,
  DEFAULT_STEEL_VALUE,
  DEFAULT_TITANIUM_VALUE,
  DISCOUNT_CARDS,
  LIMITS,
} from './constants';
import type { BoardId } from './boards';
import { MAX_INITIAL_CARDS, PRELUDES_PER_PLAYER, findCorporation, findPrelude, type PreludeDef } from './catalog';
import { placeOcean, raiseOxygen, raiseTemperature } from './globals';
import { log } from './log';
import { emptyScore } from './scoring';
import { productionMin } from './state';
import type { Game, Player, ResourceKey, ResourceMap } from './types';
import { filled, uid } from './util';

export interface PlayerSetup {
  name: string;
  color: string;
  /** Corporación del catálogo; null = cargar nombre y M€ a mano. */
  corporationId: string | null;
  corporation: string;
  startingMC: number;
  /** Cartas que se queda del reparto inicial (se pagan con los M€ de la corporación). */
  initialCards: number;
  preludes: string[];
}

export interface GameSetup {
  name: string;
  players: PlayerSetup[];
  corporateEra: boolean;
  venus: boolean;
  prelude: boolean;
  board: BoardId;
}

export const newPlayerSetup = (n: number, color: string): PlayerSetup => ({
  name: `Jugador ${n}`,
  color,
  corporationId: 'beginner',
  corporation: '',
  startingMC: 0,
  // Con Beginner Corporation las 10 cartas del reparto son gratis: se las queda todas
  initialCards: MAX_INITIAL_CARDS,
  preludes: [],
});

/** Problemas que impiden empezar la partida con este jugador. */
export function setupProblems(s: PlayerSetup, withPreludes: boolean): string[] {
  const problems: string[] = [];
  const { afterCards, final } = setupBalance(s);
  if (afterCards < 0) problems.push(`No le alcanzan los M€ para ${s.initialCards} cartas (faltan ${-afterCards}).`);
  else if (withPreludes && final < 0) problems.push(`No le alcanzan los M€ para pagar los preludios (faltan ${-final}).`);
  if (withPreludes && s.preludes.filter(Boolean).length < PRELUDES_PER_PLAYER) {
    problems.push(`Elegí ${PRELUDES_PER_PLAYER} preludios.`);
  }
  return problems;
}

/**
 * M€ del jugador en cada paso del armado: después de comprar las cartas iniciales
 * (no puede quedar negativo) y después de pagar los preludios.
 */
export function setupBalance(s: PlayerSetup): { afterCards: number; final: number; cardPrice: number } {
  const corp = findCorporation(s.corporationId);
  const start = corp ? corp.startingMC + (corp.stock?.megacredits ?? 0) : Math.max(0, s.startingMC || 0);
  const cardPrice = corp?.freeInitialCards ? 0 : (corp?.cardCost ?? DEFAULT_CARD_COST);
  const afterCards = start - s.initialCards * cardPrice;
  const preludeMC = s.preludes.reduce((sum, id) => sum + (findPrelude(id)?.stock?.megacredits ?? 0), 0);
  return { afterCards, final: afterCards + preludeMC, cardPrice };
}

export function createGame(setup: GameSetup): Game {
  const solo = setup.players.length === 1;
  const baseProduction = setup.corporateEra ? 0 : 1;
  const players: Player[] = setup.players.map((s, i) => ({
    id: uid(),
    name: s.name.trim() || `Jugador ${i + 1}`,
    color: s.color,
    corporation: s.corporation.trim(),
    corporationId: null,
    tr: solo ? 14 : 20,
    resources: { ...filled(0), megacredits: Math.max(0, s.startingMC || 0) },
    production: filled(baseProduction),
    greeneryCost: DEFAULT_GREENERY_COST,
    steelValue: DEFAULT_STEEL_VALUE,
    titaniumValue: DEFAULT_TITANIUM_VALUE,
    cardCost: DEFAULT_CARD_COST,
    discounts: [],
    score: emptyScore(),
  }));
  const now = Date.now();
  const game: Game = {
    id: uid(),
    name: setup.name.trim() || 'Partida',
    createdAt: now,
    updatedAt: now,
    generation: 1,
    players,
    activePlayerId: players[0].id,
    globals: { temperature: LIMITS.temperature.min, oxygen: 0, oceans: 0, venus: 0 },
    options: { corporateEra: setup.corporateEra, venus: setup.venus, prelude: setup.prelude, board: setup.board },
    log: [],
    turn: { playerId: players[0].id, actions: 0 },
    passed: [],
    actionsThisGen: {},
    turnNotice: null,
    researchPending: false,
    reminder: null,
    milestones: [],
    awards: [],
    phase: 'playing',
    awardValues: {},
    researchDone: [],
  };
  log(game, `Partida creada con ${players.length} jugador${players.length > 1 ? 'es' : ''}`);
  players.forEach((p, i) => applySetup(game, p, setup.players[i], setup.prelude));
  return game;
}

/** Corporación → cartas iniciales → preludios, en el orden del juego. */
function applySetup(g: Game, p: Player, s: PlayerSetup, withPreludes: boolean) {
  const corp = findCorporation(s.corporationId);
  if (corp) {
    p.corporationId = corp.id;
    p.corporation = corp.name;
    p.resources.megacredits = corp.startingMC;
    addAmounts(p, 'resources', corp.stock);
    addAmounts(p, 'production', corp.production);
    if (corp.greeneryCost) p.greeneryCost = corp.greeneryCost;
    if (corp.titaniumValue) p.titaniumValue = corp.titaniumValue;
    if (corp.cardCost !== undefined) p.cardCost = corp.cardCost;
    const discount = DISCOUNT_CARDS.find((d) => d.id === corp.discountId);
    if (discount) {
      p.discounts.push({
        id: uid(),
        cardId: discount.id,
        name: discount.name,
        amount: discount.amount,
        scope: discount.scope,
      });
    }
    log(g, `${p.name}: corporación ${corp.name} (${corp.startingMC} M€)`);
  }

  const { cardPrice } = setupBalance(s);
  if (s.initialCards > 0) {
    const cost = s.initialCards * cardPrice;
    p.resources.megacredits = Math.max(0, p.resources.megacredits - cost);
    log(g, `${p.name}: ${s.initialCards} cartas iniciales${cost ? ` (−${cost} M€)` : ' (gratis)'}`);
  }

  if (!withPreludes) return;
  for (const id of s.preludes) {
    const prelude = findPrelude(id);
    if (prelude) applyPrelude(g, p, prelude);
  }
}

function applyPrelude(g: Game, p: Player, d: PreludeDef) {
  const notes: string[] = [];
  addAmounts(p, 'production', d.production);
  addAmounts(p, 'resources', d.stock);
  if (d.tr) {
    p.tr += d.tr;
    notes.push(`+${d.tr} TR`);
  }
  for (let i = 0; i < (d.temperature ?? 0); i++) raiseTemperature(g, p, notes);
  for (let i = 0; i < (d.oxygen ?? 0); i++) raiseOxygen(g, p, notes);
  for (let i = 0; i < (d.oceans ?? 0); i++) placeOcean(g, p, notes);
  p.score.greeneries += d.greeneries ?? 0;
  p.score.cities += d.cities ?? 0;
  log(g, `${p.name}: preludio ${d.name}${notes.length ? ` · ${notes.join(' · ')}` : ''}`);
}

function addAmounts(p: Player, target: 'resources' | 'production', amounts?: Partial<ResourceMap>) {
  for (const [k, v] of Object.entries(amounts ?? {}) as [ResourceKey, number][]) {
    const min = target === 'production' ? productionMin(k) : 0;
    p[target][k] = Math.max(min, p[target][k] + v);
  }
}
