export const RESOURCES = ['megacredits', 'steel', 'titanium', 'plants', 'energy', 'heat'] as const;
export type ResourceKey = (typeof RESOURCES)[number];
export type ResourceMap = Record<ResourceKey, number>;

export interface Player {
  id: string;
  name: string;
  color: string;
  corporation: string;
  tr: number;
  resources: ResourceMap;
  production: ResourceMap;
  /** Plantas necesarias para un bosque (8 normalmente, 7 con Ecoline). */
  greeneryCost: number;
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
}
