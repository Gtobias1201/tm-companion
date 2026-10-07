import {
  DEFAULT_CARD_COST,
  DEFAULT_GREENERY_COST,
  DEFAULT_STEEL_VALUE,
  DEFAULT_TITANIUM_VALUE,
  DISCOUNT_CARDS,
  GLOBAL_INFO,
  HEAT_PER_TEMPERATURE,
  LIMITS,
  RESEARCH_CARDS,
  RESOURCE_INFO,
  SOLO_GENERATIONS,
  formatTemperature,
} from './constants';
import {
  AWARD_COSTS,
  AWARD_VP,
  MAX_MILESTONES,
  MILESTONE_COST,
  MILESTONE_VP,
  findBoard,
  type AwardDef,
  type BoardId,
} from './boards';
import { CREDICOR_REBATE, PRELUDES_PER_PLAYER, findCorporation, findPrelude, type PreludeDef } from './catalog';
import {
  RESOURCES,
  type CardTag,
  type Discount,
  type Game,
  type GlobalKey,
  type Payment,
  type Player,
  type PurchaseKind,
  type ResourceKey,
  type ResourceMap,
  type PlayerScore,
  type ScoreKey,
} from './types';

export type TileKind = 'greenery' | 'city' | 'ocean';

export type PlayerPatch = Partial<
  Pick<Player, 'name' | 'color' | 'corporation' | 'greeneryCost' | 'steelValue' | 'titaniumValue' | 'cardCost'>
>;

export type Action =
  | { type: 'resource'; playerId: string; key: ResourceKey; delta: number }
  | { type: 'production'; playerId: string; key: ResourceKey; delta: number }
  | { type: 'tr'; playerId: string; delta: number }
  | { type: 'raiseGlobal'; param: GlobalKey; playerId: string }
  | { type: 'lowerGlobal'; param: GlobalKey }
  | { type: 'greenery'; playerId: string }
  | { type: 'heatToTemperature'; playerId: string }
  | {
      type: 'pay';
      playerId: string;
      cost: number;
      payment: Payment;
      listCost?: number;
      label?: string;
      /** Proyecto estándar pagado: su efecto se aplica solo. */
      projectId?: string;
    }
  /** declared: valor que informa el jugador para hitos que la app no puede medir. */
  | { type: 'claimMilestone'; playerId: string; milestoneId: string; declared?: number }
  | { type: 'fundAward'; playerId: string; awardId: string }
  | { type: 'score'; playerId: string; key: ScoreKey; delta: number }
  | { type: 'finalGreenery'; playerId: string }
  | { type: 'setAwardValue'; awardId: string; playerId: string; value: number }
  | { type: 'advancePhase' }
  /** Investigación de un solo jugador desde su celular (modo online). */
  | { type: 'researchBuy'; playerId: string; cards: number }
  /** Loseta colocada por una carta de proyecto (no gasta acción: la acción fue jugar la carta). */
  | { type: 'placeTile'; playerId: string; tile: TileKind }
  | { type: 'addDiscount'; playerId: string; discount: Omit<Discount, 'id'> }
  | { type: 'removeDiscount'; playerId: string; discountId: string }
  | { type: 'registerAction'; playerId: string }
  | { type: 'endTurn'; playerId: string }
  | { type: 'pass'; playerId: string }
  | { type: 'dismissNotice' }
  | { type: 'dismissReminder' }
  | { type: 'research'; purchases: Record<string, number> }
  | { type: 'productionPhase' }
  | { type: 'setActive'; playerId: string }
  | { type: 'updatePlayer'; playerId: string; patch: PlayerPatch };

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
  corporationId: null,
  corporation: '',
  startingMC: 0,
  initialCards: 0,
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

export function uid(): string {
  // randomUUID solo existe en contextos seguros (no al abrir por IP de la red local)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const filled = (n: number): ResourceMap =>
  Object.fromEntries(RESOURCES.map((k) => [k, n])) as ResourceMap;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export const ACTIONS_PER_TURN = 2;

/** Acciones de la app que consumen una acción del turno. */
const TURN_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'pay',
  'greenery',
  'heatToTemperature',
  'registerAction',
  'claimMilestone',
  'fundAward',
]);

const emptyScore = (): PlayerScore => ({
  greeneries: 0,
  cities: 0,
  cityPoints: 0,
  cardPoints: 0,
  jovianCards: 0,
  jovianTags: 0,
});

/** Cambios que no se guardan en el historial de deshacer. */
export const isViewOnly = (a: Action) =>
  a.type === 'setActive' || a.type === 'dismissNotice' || a.type === 'dismissReminder';

export const productionMin = (key: ResourceKey) => (key === 'megacredits' ? -5 : 0);

export const isSolo = (g: Game) => g.players.length === 1;

export const firstPlayer = (g: Game) => g.players[(g.generation - 1) % g.players.length];

export function isTerraformed(g: Game): boolean {
  const { temperature, oxygen, oceans } = g.globals;
  return (
    temperature >= LIMITS.temperature.max && oxygen >= LIMITS.oxygen.max && oceans >= LIMITS.oceans.max
  );
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
      p.discounts.push({ id: uid(), cardId: discount.id, name: discount.name, amount: discount.amount, scope: discount.scope });
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

/** Ganancias que recibirá el jugador en la fase de producción. */
export function productionPreview(p: Player): ResourceMap {
  const gains = filled(0);
  for (const k of RESOURCES) gains[k] = Math.max(0, p.production[k]);
  gains.megacredits = p.tr + p.production.megacredits;
  gains.heat += p.resources.energy;
  gains.energy = p.production.energy - p.resources.energy;
  return gains;
}

/** Aplica una acción y devuelve una partida nueva (o la misma si no cambió nada). */
export function applyAction(game: Game, action: Action): Game {
  // Completa campos nuevos también en partidas que ya estaban abiertas antes de actualizar
  const g = normalizeGame(structuredClone(game));
  if (TURN_ACTIONS.has(action.type) && 'playerId' in action && !isTurnOf(g, action.playerId)) return game;
  if (!isViewOnly(action)) g.turnNotice = null;
  if (!run(g, action)) return game;
  if (TURN_ACTIONS.has(action.type) && 'playerId' in action) countAction(g, action.playerId);
  g.updatedAt = Date.now();
  return g;
}

/** Durante la fase de investigación nadie puede hacer acciones todavía. */
export const isTurnOf = (g: Game, playerId: string) =>
  g.phase === 'playing' && !g.researchPending && g.turn?.playerId === playerId;

/** La partida termina al final de la generación en que se completa la terraformación. */
export const isLastGeneration = (g: Game) =>
  isTerraformed(g) || (isSolo(g) && g.generation >= SOLO_GENERATIONS);

/** En solitario se gana si Marte (y Venus, con Venus Next) quedó terraformado. */
export const soloWon = (g: Game) =>
  isTerraformed(g) && (!g.options.venus || g.globals.venus >= LIMITS.venus.max);

/** Cuántas cartas puede comprar el jugador en la fase de investigación. */
export const maxCardsToBuy = (p: Player) =>
  Math.min(RESEARCH_CARDS, p.cardCost > 0 ? Math.floor(p.resources.megacredits / p.cardCost) : RESEARCH_CARDS);

function run(g: Game, a: Action): boolean {
  if (a.type === 'productionPhase') return productionPhase(g);
  if (a.type === 'advancePhase') return advancePhase(g);
  if (a.type === 'setAwardValue') {
    if (g.phase !== 'scoring' || a.value < 0) return false;
    g.awardValues[a.awardId] = { ...g.awardValues[a.awardId], [a.playerId]: Math.round(a.value) };
    return true;
  }
  if (a.type === 'lowerGlobal') return lowerGlobal(g, a.param);
  if (a.type === 'research') return researchPhase(g, a.purchases);
  if (a.type === 'dismissReminder') {
    if (!g.reminder) return false;
    g.reminder = null;
    return true;
  }
  if (a.type === 'dismissNotice') {
    if (!g.turnNotice) return false;
    g.turnNotice = null;
    return true;
  }

  const p = g.players.find((x) => x.id === a.playerId);
  if (!p) return false;

  switch (a.type) {
    case 'registerAction':
      log(g, `${p.name}: otra acción`);
      return true;

    case 'endTurn': {
      if (!g.turn || g.turn.playerId !== p.id || g.turn.actions === 0) return false;
      log(g, `${p.name}: terminó su turno con 1 acción`);
      advanceTurn(g, p.id, 'end');
      return true;
    }

    case 'pass': {
      if (!isTurnOf(g, p.id)) return false;
      g.passed.push(p.id);
      log(g, `${p.name}: pasó`);
      advanceTurn(g, p.id, 'pass');
      return true;
    }

    case 'setActive':
      if (g.activePlayerId === p.id) return false;
      g.activePlayerId = p.id;
      return true;

    case 'resource': {
      const prev = p.resources[a.key];
      const next = Math.max(0, prev + a.delta);
      if (next === prev) return false;
      p.resources[a.key] = next;
      const label = RESOURCE_INFO[a.key].label;
      logDelta(g, `res:${p.id}:${a.key}`, next - prev, (n) => `${p.name}: ${signed(n)} ${label}`);
      return true;
    }

    case 'production': {
      const prev = p.production[a.key];
      const next = Math.max(productionMin(a.key), prev + a.delta);
      if (next === prev) return false;
      p.production[a.key] = next;
      const label = RESOURCE_INFO[a.key].label;
      logDelta(g, `prod:${p.id}:${a.key}`, next - prev, (n) => `${p.name}: ${signed(n)} producción de ${label}`);
      return true;
    }

    case 'tr': {
      const next = Math.max(0, p.tr + a.delta);
      if (next === p.tr) return false;
      const d = next - p.tr;
      p.tr = next;
      logDelta(g, `tr:${p.id}`, d, (n) => `${p.name}: ${signed(n)} TR`);
      return true;
    }

    case 'raiseGlobal': {
      const notes: string[] = [];
      if (!raise(g, a.param, p, notes)) return false;
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'greenery': {
      if (p.resources.plants < p.greeneryCost) return false;
      p.resources.plants -= p.greeneryCost;
      const notes = [`bosque (−${p.greeneryCost} plantas)`];
      p.score.greeneries += 1;
      if (!raiseOxygen(g, p, notes)) notes.push('oxígeno al máximo, sin TR');
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'heatToTemperature': {
      if (p.resources.heat < HEAT_PER_TEMPERATURE) return false;
      if (g.globals.temperature >= LIMITS.temperature.max) return false;
      p.resources.heat -= HEAT_PER_TEMPERATURE;
      const notes = [`−${HEAT_PER_TEMPERATURE} calor`];
      raiseTemperature(g, p, notes);
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'pay': {
      const { megacredits, steel, titanium } = a.payment;
      const listCost = a.listCost ?? a.cost;
      if (listCost <= 0 || a.cost < 0 || !canAfford(p, a.payment) || paymentValue(p, a.payment) < a.cost) return false;
      p.resources.megacredits -= megacredits;
      p.resources.steel -= steel;
      p.resources.titanium -= titanium;
      const what = a.label ? `${a.label} ` : '';
      const saved = listCost - a.cost;
      const discount = saved > 0 ? ` (lista ${listCost}, −${saved} por descuentos)` : '';
      const effects: string[] = [];
      if (a.projectId) applyStandardProject(g, p, a.projectId, effects);
      let rebate = '';
      if (p.corporationId === 'credicor' && listCost >= CREDICOR_REBATE.minCost) {
        p.resources.megacredits += CREDICOR_REBATE.amount;
        rebate = ` · CrediCor +${CREDICOR_REBATE.amount} M€`;
      }
      const effectText = effects.length ? ` · ${effects.join(' · ')}` : '';
      log(g, `${p.name}: pagó ${what}${a.cost} M€${discount} con ${describePayment(a.payment)}${rebate}${effectText}`);
      return true;
    }

    case 'researchBuy': {
      if (!g.researchPending || g.researchDone.includes(p.id)) return false;
      const n = Math.round(a.cards);
      if (n < 0 || n > maxCardsToBuy(p)) return false;
      const cost = n * p.cardCost;
      p.resources.megacredits -= cost;
      g.researchDone.push(p.id);
      log(g, `Investigación: ${p.name} ${n} carta${n === 1 ? '' : 's'}${n ? ` (−${cost} M€)` : ''}`);
      if (g.players.every((x) => g.researchDone.includes(x.id))) g.researchPending = false;
      return true;
    }

    case 'placeTile': {
      if (g.phase !== 'playing') return false;
      const notes: string[] = [];
      if (a.tile === 'greenery') {
        p.score.greeneries += 1;
        notes.push('loseta de bosque');
        // Colocar un bosque siempre sube el oxígeno, venga de donde venga
        if (!raiseOxygen(g, p, notes)) notes.push('oxígeno al máximo, sin TR');
      } else if (a.tile === 'city') {
        p.score.cities += 1;
        notes.push('loseta de ciudad');
      } else {
        notes.push('loseta de océano');
        if (!placeOcean(g, p, notes)) return false;
      }
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'finalGreenery': {
      if (g.phase !== 'finalGreenery' || p.resources.plants < p.greeneryCost) return false;
      p.resources.plants -= p.greeneryCost;
      p.score.greeneries += 1;
      const notes = [`bosque final (−${p.greeneryCost} plantas)`];
      raiseOxygen(g, p, notes);
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'claimMilestone': {
      const board = findBoard(g.options.board);
      const def = board.milestones.find((m) => m.id === a.milestoneId);
      if (!def || g.milestones.length >= MAX_MILESTONES || g.milestones.some((m) => m.id === def.id)) return false;
      if (p.resources.megacredits < MILESTONE_COST) return false;
      const value = def.value ? def.value(p, g) : a.declared;
      if (value === undefined || value < def.threshold) return false;
      p.resources.megacredits -= MILESTONE_COST;
      g.milestones.push({ id: def.id, playerId: p.id });
      log(g, `${p.name}: reclamó el hito ${def.name} (−${MILESTONE_COST} M€, +${MILESTONE_VP} PV)`);
      return true;
    }

    case 'fundAward': {
      const board = findBoard(g.options.board);
      const def = board.awards.find((x) => x.id === a.awardId);
      const cost = AWARD_COSTS[g.awards.length];
      if (!def || cost === undefined || g.awards.some((x) => x.id === def.id)) return false;
      if (p.resources.megacredits < cost) return false;
      p.resources.megacredits -= cost;
      g.awards.push({ id: def.id, playerId: p.id });
      log(g, `${p.name}: financió el premio ${def.name} (−${cost} M€)`);
      return true;
    }

    case 'score': {
      const prev = p.score[a.key];
      const next = Math.max(0, prev + a.delta);
      if (next === prev) return false;
      p.score[a.key] = next;
      logDelta(g, `score:${p.id}:${a.key}`, next - prev, (n) => `${p.name}: ${n > 0 ? '+' : ''}${n} ${SCORE_LABELS[a.key]}`);
      return true;
    }

    case 'addDiscount': {
      const { cardId } = a.discount;
      if (cardId && p.discounts.some((d) => d.cardId === cardId)) return false;
      const amount = Math.max(1, Math.round(a.discount.amount));
      p.discounts.push({ ...a.discount, amount, id: uid() });
      log(g, `${p.name}: agregó descuento ${a.discount.name} (−${amount})`);
      return true;
    }

    case 'removeDiscount': {
      const d = p.discounts.find((x) => x.id === a.discountId);
      if (!d) return false;
      p.discounts = p.discounts.filter((x) => x.id !== a.discountId);
      log(g, `${p.name}: quitó descuento ${d.name}`);
      return true;
    }

    case 'updatePlayer': {
      const patch = { ...a.patch };
      for (const k of ['greeneryCost', 'steelValue', 'titaniumValue'] as const) {
        if (patch[k] !== undefined) patch[k] = Math.max(1, Math.round(patch[k]));
      }
      if (patch.cardCost !== undefined) patch.cardCost = Math.max(0, Math.round(patch.cardCost));
      Object.assign(p, patch);
      return true;
    }
  }
}

// ---------- Pagos con acero y titanio ----------

export interface PaymentRules {
  /** La carta tiene etiqueta de edificio: acepta acero. */
  steel: boolean;
  /** La carta tiene etiqueta espacial: acepta titanio. */
  titanium: boolean;
}

export const paymentValue = (p: Player, pay: Payment) =>
  pay.megacredits + pay.steel * p.steelValue + pay.titanium * p.titaniumValue;

export const canAfford = (p: Player, pay: Payment) =>
  pay.megacredits >= 0 &&
  pay.steel >= 0 &&
  pay.titanium >= 0 &&
  pay.megacredits <= p.resources.megacredits &&
  pay.steel <= p.resources.steel &&
  pay.titanium <= p.resources.titanium;

/** Completa con M€ lo que no cubren el acero y el titanio elegidos. */
export function paymentWith(p: Player, cost: number, steel: number, titanium: number): Payment {
  const covered = steel * p.steelValue + titanium * p.titaniumValue;
  return { megacredits: Math.max(0, cost - covered), steel, titanium };
}

/**
 * Pago más eficiente para un costo dado. Prioridades:
 * 1. no pagar de más (el acero/titanio sobrante no da vuelto),
 * 2. gastar la menor cantidad de M€ posible,
 * 3. conservar el titanio, que es más escaso.
 * Devuelve null si el jugador no puede pagar.
 */
export function bestPayment(p: Player, cost: number, rules: PaymentRules): Payment | null {
  if (cost <= 0) return { megacredits: 0, steel: 0, titanium: 0 };
  const maxSteel = rules.steel ? Math.min(p.resources.steel, Math.ceil(cost / p.steelValue)) : 0;
  const maxTitanium = rules.titanium ? Math.min(p.resources.titanium, Math.ceil(cost / p.titaniumValue)) : 0;

  let best: Payment | null = null;
  let bestScore: number[] = [];
  for (let t = 0; t <= maxTitanium; t++) {
    for (let s = 0; s <= maxSteel; s++) {
      const pay = paymentWith(p, cost, s, t);
      if (!canAfford(p, pay)) continue;
      const score = [paymentValue(p, pay) - cost, pay.megacredits, t];
      if (!best || isLower(score, bestScore)) {
        best = pay;
        bestScore = score;
      }
    }
  }
  return best;
}

function isLower(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

export function describePayment(pay: Payment): string {
  const parts: string[] = [];
  if (pay.steel) parts.push(`${pay.steel} acero`);
  if (pay.titanium) parts.push(`${pay.titanium} titanio`);
  if (pay.megacredits || parts.length === 0) parts.push(`${pay.megacredits} M€`);
  return parts.join(' + ');
}

/**
 * Descuentos que aplican a una compra. Cada efecto descuenta una vez por carta,
 * aunque la carta tenga varias etiquetas del mismo tipo. En proyectos estándar
 * solo aplican descuentos por etiqueta (p. ej. Thorgate en la planta de energía).
 */
export function applicableDiscounts(p: Player, kind: PurchaseKind, tags: CardTag[]): Discount[] {
  return p.discounts.filter((d) =>
    d.scope === 'all' ? kind === 'card' : tags.includes(d.scope),
  );
}

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

// ---------- Parámetros globales (con sus bonus del tablero) ----------

function raise(g: Game, param: GlobalKey, p: Player, notes: string[]): boolean {
  switch (param) {
    case 'temperature':
      return raiseTemperature(g, p, notes);
    case 'oxygen':
      return raiseOxygen(g, p, notes);
    case 'oceans':
      return placeOcean(g, p, notes);
    case 'venus':
      return raiseVenus(g, p, notes);
  }
}

function raiseTemperature(g: Game, p: Player, notes: string[]): boolean {
  const L = LIMITS.temperature;
  if (g.globals.temperature >= L.max) return false;
  g.globals.temperature += L.step;
  p.tr += 1;
  const t = g.globals.temperature;
  notes.push(`temperatura a ${formatTemperature(t)} (+1 TR)`);
  if (t === -24 || t === -20) {
    p.production.heat += 1;
    notes.push('bonus: +1 producción de calor');
  }
  if (t === 0 && g.globals.oceans < LIMITS.oceans.max) {
    notes.push('bonus: coloca un océano');
    placeOcean(g, p, notes);
  }
  return true;
}

function raiseOxygen(g: Game, p: Player, notes: string[]): boolean {
  const L = LIMITS.oxygen;
  if (g.globals.oxygen >= L.max) return false;
  g.globals.oxygen += L.step;
  p.tr += 1;
  notes.push(`oxígeno a ${g.globals.oxygen}% (+1 TR)`);
  if (g.globals.oxygen === 8 && g.globals.temperature < LIMITS.temperature.max) {
    notes.push('bonus: sube la temperatura');
    raiseTemperature(g, p, notes);
  }
  return true;
}

function placeOcean(g: Game, p: Player, notes: string[]): boolean {
  if (g.globals.oceans >= LIMITS.oceans.max) return false;
  g.globals.oceans += 1;
  p.tr += 1;
  notes.push(`océano ${g.globals.oceans}/9 (+1 TR)`);
  return true;
}

function raiseVenus(g: Game, p: Player, notes: string[]): boolean {
  const L = LIMITS.venus;
  if (g.globals.venus >= L.max) return false;
  g.globals.venus += L.step;
  p.tr += 1;
  notes.push(`Venus a ${g.globals.venus}% (+1 TR)`);
  if (g.globals.venus === 8) {
    notes.push('bonus: roba 1 carta');
    g.reminder = { playerId: p.id, text: `${p.name} llevó Venus al 8%: robá 1 carta.` };
  }
  if (g.globals.venus === 16) {
    p.tr += 1;
    notes.push('bonus: +1 TR');
  }
  return true;
}

/** Corrección manual: baja el parámetro sin tocar TR ni bonus. */
function lowerGlobal(g: Game, param: GlobalKey): boolean {
  const L = LIMITS[param];
  if (g.globals[param] <= L.min) return false;
  g.globals[param] -= L.step;
  log(g, `Corrección: ${GLOBAL_INFO[param].label} a ${GLOBAL_INFO[param].format(g.globals[param])}`);
  return true;
}

function productionPhase(g: Game): boolean {
  if (g.phase !== 'playing') return false;
  const ending = isLastGeneration(g);
  for (const p of g.players) {
    const gains = productionPreview(p);
    for (const k of RESOURCES) {
      if (k !== 'energy') p.resources[k] = Math.max(0, p.resources[k] + gains[k]);
    }
    // la energía sobrante pasó a calor: solo queda la nueva producción
    p.resources.energy = Math.max(0, p.production.energy);
  }
  log(g, `Fin de la generación ${g.generation}: producción aplicada`);
  if (ending) {
    g.phase = 'finalGreenery';
    g.turn = null;
    g.passed = [];
    g.turnNotice = null;
    g.researchPending = false;
    log(g, 'Fin de la partida: bosques finales y puntuación');
    return true;
  }
  g.generation += 1;
  g.activePlayerId = firstPlayer(g).id;
  g.turn = { playerId: g.activePlayerId, actions: 0 };
  g.passed = [];
  g.actionsThisGen = {};
  g.turnNotice = null;
  g.researchPending = true;
  g.researchDone = [];
  return true;
}

/** Fase de investigación: cada jugador paga las cartas que se queda de las 4 que robó. */
function researchPhase(g: Game, purchases: Record<string, number>): boolean {
  if (!g.researchPending) return false;
  for (const p of g.players) {
    const n = purchases[p.id] ?? 0;
    if (n < 0 || n > maxCardsToBuy(p)) return false;
  }
  const bought: string[] = [];
  for (const p of g.players) {
    const n = purchases[p.id] ?? 0;
    p.resources.megacredits -= n * p.cardCost;
    bought.push(`${p.name} ${n} carta${n === 1 ? '' : 's'}${n ? ` (−${n * p.cardCost} M€)` : ''}`);
  }
  g.researchPending = false;
  log(g, `Investigación: ${bought.join(' · ')}`);
  return true;
}

// ---------- Proyectos estándar y puntos ----------

/** Aplica el efecto de un proyecto estándar ya pagado. */
function applyStandardProject(g: Game, p: Player, projectId: string, notes: string[]) {
  switch (projectId) {
    case 'power-plant':
      p.production.energy += 1;
      notes.push('+1 producción de energía');
      return;
    case 'asteroid':
      raiseTemperature(g, p, notes);
      return;
    case 'air-scrapping':
      raiseVenus(g, p, notes);
      return;
    case 'aquifer':
      placeOcean(g, p, notes);
      return;
    case 'greenery':
      p.score.greeneries += 1;
      notes.push('bosque');
      raiseOxygen(g, p, notes);
      return;
    case 'city':
      p.score.cities += 1;
      p.production.megacredits += 1;
      notes.push('ciudad · +1 producción de M€');
      return;
  }
}

export const SCORE_LABELS: Record<ScoreKey, string> = {
  greeneries: 'bosques',
  cities: 'ciudades',
  cityPoints: 'PV por ciudades',
  cardPoints: 'PV de cartas',
  jovianCards: 'cartas que puntúan por jovianos',
  jovianTags: 'etiquetas jovianas',
};

export interface ScoreBreakdown {
  tr: number;
  milestones: number;
  greeneries: number;
  cities: number;
  cards: number;
  jovian: number;
  awards: number;
  total: number;
}

/** Puntos de victoria actuales (los premios cuentan desde la puntuación final). */
export function scoreOf(g: Game, p: Player): ScoreBreakdown {
  const milestones = g.milestones.filter((m) => m.playerId === p.id).length * MILESTONE_VP;
  const s = p.score;
  const breakdown = {
    tr: p.tr,
    milestones,
    greeneries: s.greeneries,
    cities: s.cityPoints,
    cards: s.cardPoints,
    // Cada carta da 1 PV por etiqueta joviana
    jovian: s.jovianCards * s.jovianTags,
    awards: awardPoints(g, p.id),
  };
  return { ...breakdown, total: Object.values(breakdown).reduce((a, b) => a + b, 0) };
}

// ---------- Final de la partida ----------

function advancePhase(g: Game): boolean {
  if (g.phase === 'finalGreenery') {
    g.phase = 'scoring';
    log(g, 'Puntuación final');
    return true;
  }
  if (g.phase === 'scoring') {
    if (awardResults(g).some((r) => !r.complete)) return false;
    g.phase = 'finished';
    const [winner] = finalRanking(g);
    log(g, isSolo(g) ? (soloWon(g) ? 'Partida ganada: Marte terraformado' : 'Partida perdida: Marte sin terraformar') : `Ganó ${winner.p.name} con ${winner.s.total} PV`);
    return true;
  }
  return false;
}

export interface AwardResult {
  award: AwardDef;
  /** Valor de cada jugador (undefined = falta informarlo). */
  values: Record<string, number | undefined>;
  complete: boolean;
  first: string[];
  second: string[];
}

/**
 * Premios financiados con sus ganadores: 5 PV a los primeros (empatados incluidos) y 2 a los
 * segundos, salvo que haya empate en el primer puesto o la partida sea de 2 jugadores.
 */
export function awardResults(g: Game): AwardResult[] {
  const board = findBoard(g.options.board);
  return g.awards.flatMap((claim): AwardResult[] => {
    const award = board.awards.find((a) => a.id === claim.id);
    if (!award) return [];
    const values: Record<string, number | undefined> = {};
    for (const p of g.players) values[p.id] = award.metric ? award.metric(p) : g.awardValues[award.id]?.[p.id];
    const complete = Object.values(values).every((v) => v !== undefined);
    if (!complete) return [{ award, values, complete, first: [], second: [] }];
    const entries = Object.entries(values) as [string, number][];
    const best = Math.max(...entries.map(([, v]) => v));
    const first = entries.filter(([, v]) => v === best).map(([id]) => id);
    let second: string[] = [];
    if (first.length === 1 && g.players.length > 2) {
      const rest = entries.filter(([, v]) => v < best);
      if (rest.length) {
        const next = Math.max(...rest.map(([, v]) => v));
        second = rest.filter(([, v]) => v === next).map(([id]) => id);
      }
    }
    return [{ award, values, complete, first, second }];
  });
}

function awardPoints(g: Game, playerId: string): number {
  if (g.phase !== 'scoring' && g.phase !== 'finished') return 0;
  return awardResults(g).reduce(
    (sum, r) => sum + (r.first.includes(playerId) ? AWARD_VP.first : r.second.includes(playerId) ? AWARD_VP.second : 0),
    0,
  );
}

/** Jugadores ordenados por PV; el desempate es por M€. */
export function finalRanking(g: Game): { p: Player; s: ScoreBreakdown }[] {
  return g.players
    .map((p) => ({ p, s: scoreOf(g, p) }))
    .sort((a, b) => b.s.total - a.s.total || b.p.resources.megacredits - a.p.resources.megacredits);
}

// ---------- Turnos ----------

function countAction(g: Game, playerId: string) {
  if (!g.turn) return;
  g.turn.actions += 1;
  g.actionsThisGen[playerId] = (g.actionsThisGen[playerId] ?? 0) + 1;
  if (g.turn.actions >= ACTIONS_PER_TURN) advanceTurn(g, playerId, 'actions');
}

/** Pasa el turno al siguiente jugador (en orden) que todavía no pasó. */
function advanceTurn(g: Game, fromId: string, reason: 'actions' | 'end' | 'pass') {
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

// ---------- Registro ----------

function log(g: Game, text: string) {
  g.log.push({ id: uid(), generation: g.generation, text, at: Date.now() });
  if (g.log.length > 400) g.log.splice(0, g.log.length - 400);
}

const MERGE_WINDOW_MS = 20_000;

function logDelta(g: Game, mergeKey: string, delta: number, format: (total: number) => string) {
  const last = g.log[g.log.length - 1];
  if (last && last.mergeKey === mergeKey && Date.now() - last.at < MERGE_WINDOW_MS) {
    const total = (last.amount ?? 0) + delta;
    if (total === 0) {
      g.log.pop();
      return;
    }
    last.amount = total;
    last.text = format(total);
    last.at = Date.now();
    return;
  }
  g.log.push({ id: uid(), generation: g.generation, text: format(delta), at: Date.now(), mergeKey, amount: delta });
}
