import type { BoardId } from './boards';

export const RESOURCES = ['megacredits', 'steel', 'titanium', 'plants', 'energy', 'heat'] as const;
export type ResourceKey = (typeof RESOURCES)[number];
export type ResourceMap = Record<ResourceKey, number>;

export interface Player {
  id: string;
  name: string;
  color: string;
  corporation: string;
  /** Id del catálogo de corporaciones, o null si se cargó a mano. */
  corporationId: string | null;
  tr: number;
  resources: ResourceMap;
  production: ResourceMap;
  /** Plantas necesarias para un bosque (8 normalmente, 7 con Ecoline). */
  greeneryCost: number;
  /** M€ que vale cada acero al pagar cartas de edificio (2; 3 con Advanced Alloys). */
  steelValue: number;
  /** M€ que vale cada titanio al pagar cartas espaciales (3; 4 con Phobolog o Advanced Alloys). */
  titaniumValue: number;
  /** M€ por carta comprada en la fase de investigación (3; Polyphemos 5, Terralabs 1). */
  cardCost: number;
  /** Cartas en juego que abaratan otras cartas (Space Station, Earth Office, ...). */
  discounts: Discount[];
  score: PlayerScore;
}

/** Contadores para los puntos de victoria que no salen del TR. */
export interface PlayerScore {
  /** Bosques propios: 1 PV cada uno. */
  greeneries: number;
  /** Ciudades propias (para hitos como Mayor). */
  cities: number;
  /** PV de las ciudades: 1 por cada bosque adyacente. */
  cityPoints: number;
  /** PV impresos en cartas y recursos sobre cartas. */
  cardPoints: number;
  /** Cartas que dan 1 PV por etiqueta joviana (Io Mining Industries, Ganymede Colony...). */
  jovianCards: number;
  /** Etiquetas jovianas en juego, para esas cartas. */
  jovianTags: number;
}
export type ScoreKey = keyof PlayerScore;

/** Etiquetas que pueden tener descuentos o habilitar acero/titanio. */
export const CARD_TAGS = ['building', 'space', 'earth', 'science', 'power', 'venus'] as const;
export type CardTag = (typeof CARD_TAGS)[number];
export type DiscountScope = CardTag | 'all';

export interface Discount {
  id: string;
  /** Id del catálogo, o null si es un descuento personalizado. */
  cardId: string | null;
  name: string;
  amount: number;
  scope: DiscountScope;
}

export type PurchaseKind = 'card' | 'standard';

export interface Payment {
  megacredits: number;
  steel: number;
  titanium: number;
}

export interface Globals {
  temperature: number;
  oxygen: number;
  oceans: number;
  venus: number;
}
export type GlobalKey = keyof Globals;

export interface GameOptions {
  corporateEra: boolean;
  venus: boolean;
  prelude: boolean;
  board: BoardId;
}

export interface Claim {
  id: string;
  playerId: string;
}

export interface LogEntry {
  id: string;
  generation: number;
  text: string;
  at: number;
  /** Permite agrupar varios toques seguidos (+1, +1, +1) en una sola línea. */
  mergeKey?: string;
  amount?: number;
}

/** Turno en curso dentro de la fase de acciones. */
export interface TurnState {
  playerId: string;
  /** Acciones hechas en este turno (máximo 2). */
  actions: number;
}

/** Aviso de que un jugador terminó su turno, para poder volver a cargar efectos. */
export interface TurnNotice {
  playerId: string;
  reason: 'actions' | 'end' | 'pass';
}

/** playing → bosques finales → puntuación → terminada. */
export type GamePhase = 'playing' | 'finalGreenery' | 'scoring' | 'finished';

export interface Game {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  generation: number;
  players: Player[];
  activePlayerId: string;
  globals: Globals;
  options: GameOptions;
  log: LogEntry[];
  /** null cuando todos pasaron y falta la fase de producción. */
  turn: TurnState | null;
  /** Jugadores que pasaron en esta generación. */
  passed: string[];
  /** Acciones de cada jugador en la generación actual. */
  actionsThisGen: Record<string, number>;
  turnNotice: TurnNotice | null;
  /** Al empezar una generación nueva, falta que cada jugador compre sus cartas. */
  researchPending: boolean;
  /** Recordatorio de un bonus que hay que resolver en la mesa (p. ej. robar carta en Venus 8%). */
  reminder: { playerId: string; text: string } | null;
  /** Hitos reclamados, en orden. */
  milestones: Claim[];
  /** Premios financiados, en orden (define su costo). */
  awards: Claim[];
  phase: GamePhase;
  /** Valores informados por los jugadores para premios que la app no puede medir. */
  awardValues: Record<string, Record<string, number>>;
}
