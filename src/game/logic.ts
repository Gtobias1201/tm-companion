import {
  DEFAULT_CARD_COST,
  DEFAULT_GREENERY_COST,
  DEFAULT_STEEL_VALUE,
  DEFAULT_TITANIUM_VALUE,
  GLOBAL_INFO,
  HEAT_PER_TEMPERATURE,
  LIMITS,
  RESEARCH_CARDS,
  RESOURCE_INFO,
  formatTemperature,
} from './constants';
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
} from './types';

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
  | { type: 'pay'; playerId: string; cost: number; payment: Payment; listCost?: number; label?: string }
  | { type: 'addDiscount'; playerId: string; discount: Omit<Discount, 'id'> }
  | { type: 'removeDiscount'; playerId: string; discountId: string }
  | { type: 'registerAction'; playerId: string }
  | { type: 'endTurn'; playerId: string }
  | { type: 'pass'; playerId: string }
  | { type: 'dismissNotice' }
  | { type: 'research'; purchases: Record<string, number> }
  | { type: 'productionPhase' }
  | { type: 'setActive'; playerId: string }
  | { type: 'updatePlayer'; playerId: string; patch: PlayerPatch };

export interface PlayerSetup {
  name: string;
  color: string;
  corporation: string;
  startingMC: number;
}

export interface GameSetup {
  name: string;
  players: PlayerSetup[];
  corporateEra: boolean;
  venus: boolean;
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
const TURN_ACTIONS: ReadonlySet<Action['type']> = new Set(['pay', 'greenery', 'heatToTemperature', 'registerAction']);

/** Cambios que no se guardan en el historial de deshacer. */
export const isViewOnly = (a: Action) => a.type === 'setActive' || a.type === 'dismissNotice';

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
    tr: solo ? 14 : 20,
    resources: { ...filled(0), megacredits: Math.max(0, s.startingMC || 0) },
    production: filled(baseProduction),
    greeneryCost: DEFAULT_GREENERY_COST,
    steelValue: DEFAULT_STEEL_VALUE,
    titaniumValue: DEFAULT_TITANIUM_VALUE,
    cardCost: DEFAULT_CARD_COST,
    discounts: [],
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
    options: { corporateEra: setup.corporateEra, venus: setup.venus },
    log: [],
    turn: { playerId: players[0].id, actions: 0 },
    passed: [],
    actionsThisGen: {},
    turnNotice: null,
    researchPending: false,
  };
  log(game, `Partida creada con ${players.length} jugador${players.length > 1 ? 'es' : ''}`);
  return game;
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
export const isTurnOf = (g: Game, playerId: string) => !g.researchPending && g.turn?.playerId === playerId;

/** Cuántas cartas puede comprar el jugador en la fase de investigación. */
export const maxCardsToBuy = (p: Player) =>
  Math.min(RESEARCH_CARDS, p.cardCost > 0 ? Math.floor(p.resources.megacredits / p.cardCost) : RESEARCH_CARDS);

function run(g: Game, a: Action): boolean {
  if (a.type === 'productionPhase') return productionPhase(g);
  if (a.type === 'lowerGlobal') return lowerGlobal(g, a.param);
  if (a.type === 'research') return researchPhase(g, a.purchases);
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
      log(g, `${p.name}: pagó ${what}${a.cost} M€${discount} con ${describePayment(a.payment)}`);
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
  }
  // turn puede ser null a propósito (todos pasaron); solo se completa si falta el campo
  if (g.turn === undefined) g.turn = { playerId: firstPlayer(g).id, actions: 0 };
  g.passed ??= [];
  g.actionsThisGen ??= {};
  g.turnNotice ??= null;
  g.researchPending ??= false;
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
  if (g.globals.venus === 8) notes.push('bonus: roba 1 carta');
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
  for (const p of g.players) {
    const gains = productionPreview(p);
    for (const k of RESOURCES) {
      if (k !== 'energy') p.resources[k] = Math.max(0, p.resources[k] + gains[k]);
    }
    // la energía sobrante pasó a calor: solo queda la nueva producción
    p.resources.energy = Math.max(0, p.production.energy);
  }
  log(g, `Fin de la generación ${g.generation}: producción aplicada`);
  g.generation += 1;
  g.activePlayerId = firstPlayer(g).id;
  g.turn = { playerId: g.activePlayerId, actions: 0 };
  g.passed = [];
  g.actionsThisGen = {};
  g.turnNotice = null;
  g.researchPending = true;
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
