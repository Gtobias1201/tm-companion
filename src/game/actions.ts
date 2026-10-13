import type { Discount, GlobalKey, Payment, Player, ResourceKey, ScoreKey } from './types';

export type TileKind = 'greenery' | 'city' | 'ocean';

export type PlayerPatch = Partial<
  Pick<Player, 'name' | 'color' | 'corporation' | 'greeneryCost' | 'steelValue' | 'titaniumValue' | 'cardCost'>
>;

export type Action =
  | { type: 'resource'; playerId: string; key: ResourceKey; delta: number }
  | { type: 'production'; playerId: string; key: ResourceKey; delta: number }
  | { type: 'tr'; playerId: string; delta: number }
  | { type: 'raiseGlobal'; param: GlobalKey; playerId: string }
  /** Corrección: baja un paso y le quita 1 TR a quien corrige. */
  | { type: 'lowerGlobal'; param: GlobalKey; playerId: string }
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

/** Acciones de la app que consumen una acción del turno. */
export const TURN_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'pay',
  'greenery',
  'heatToTemperature',
  'registerAction',
  'claimMilestone',
  'fundAward',
]);

/** Cambios que no se guardan en el historial de deshacer. */
export const isViewOnly = (a: Action) =>
  a.type === 'setActive' || a.type === 'dismissNotice' || a.type === 'dismissReminder';
