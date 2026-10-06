import type { Game, Player } from './types';

/**
 * Mapas oficiales con sus hitos y premios. Datos verificados contra el código de la
 * versión digital (github.com/terraforming-mars/terraforming-mars).
 */

export type BoardId = 'tharsis' | 'hellas' | 'elysium';

export interface MilestoneDef {
  id: string;
  name: string;
  description: string;
  /** Valor mínimo para poder reclamarlo. */
  threshold: number;
  /** Valor que la app calcula sola, si puede. */
  value?: (p: Player, g: Game) => number;
  /** Si la app no lo puede medir: qué se le pregunta al jugador. */
  ask?: string;
}

export interface AwardDef {
  id: string;
  name: string;
  description: string;
  /** Valor con el que se compite, si la app lo conoce. */
  metric?: (p: Player) => number;
}

export interface BoardDef {
  id: BoardId;
  name: string;
  description: string;
  milestones: MilestoneDef[];
  awards: AwardDef[];
}

export const MILESTONE_COST = 8;
export const MAX_MILESTONES = 3;
export const MILESTONE_VP = 5;
export const AWARD_COSTS = [8, 14, 20];
export const AWARD_VP = { first: 5, second: 2 };

const productions = (p: Player) => Object.values(p.production);

export const BOARDS: BoardDef[] = [
  {
    id: 'tharsis',
    name: 'Tharsis',
    description: 'El mapa del juego base',
    milestones: [
      { id: 'terraformer', name: 'Terraformer', description: 'Tener 35 de TR', threshold: 35, value: (p) => p.tr },
      { id: 'mayor', name: 'Mayor', description: 'Tener 3 ciudades', threshold: 3, value: (p) => p.score.cities },
      { id: 'gardener', name: 'Gardener', description: 'Tener 3 bosques', threshold: 3, value: (p) => p.score.greeneries },
      {
        id: 'builder',
        name: 'Builder',
        description: 'Tener 8 etiquetas de edificio en juego',
        threshold: 8,
        ask: 'Etiquetas de edificio en juego',
      },
      { id: 'planner', name: 'Planner', description: 'Tener 16 cartas en la mano', threshold: 16, ask: 'Cartas en tu mano' },
    ],
    awards: [
      { id: 'landlord', name: 'Landlord', description: 'Más losetas en juego' },
      { id: 'scientist', name: 'Scientist', description: 'Más etiquetas de ciencia en juego' },
      { id: 'banker', name: 'Banker', description: 'Mayor producción de M€', metric: (p) => p.production.megacredits },
      { id: 'thermalist', name: 'Thermalist', description: 'Más calor', metric: (p) => p.resources.heat },
      {
        id: 'miner',
        name: 'Miner',
        description: 'Más acero y titanio',
        metric: (p) => p.resources.steel + p.resources.titanium,
      },
    ],
  },
  {
    id: 'hellas',
    name: 'Hellas',
    description: 'Expansión Hellas & Elysium · polo sur',
    milestones: [
      {
        id: 'diversifier',
        name: 'Diversifier',
        description: 'Tener 8 etiquetas distintas en juego',
        threshold: 8,
        ask: 'Tipos de etiqueta distintos en juego',
      },
      {
        id: 'tactician',
        name: 'Tactician',
        description: 'Tener 5 cartas con requisitos en juego',
        threshold: 5,
        ask: 'Cartas con requisitos en juego',
      },
      {
        id: 'polar-explorer',
        name: 'Polar Explorer',
        description: 'Tener 3 losetas en las dos filas inferiores',
        threshold: 3,
        ask: 'Losetas tuyas en las dos filas inferiores',
      },
      {
        id: 'energizer',
        name: 'Energizer',
        description: 'Tener 6 de producción de energía',
        threshold: 6,
        value: (p) => p.production.energy,
      },
      {
        id: 'rim-settler',
        name: 'Rim Settler',
        description: 'Tener 3 etiquetas jovianas en juego',
        threshold: 3,
        ask: 'Etiquetas jovianas en juego',
      },
    ],
    awards: [
      { id: 'cultivator', name: 'Cultivator', description: 'Más bosques', metric: (p) => p.score.greeneries },
      { id: 'magnate', name: 'Magnate', description: 'Más cartas automatizadas (verdes) en juego' },
      { id: 'space-baron', name: 'Space Baron', description: 'Más etiquetas de espacio en juego' },
      { id: 'excentric', name: 'Excentric', description: 'Más recursos sobre cartas' },
      { id: 'contractor', name: 'Contractor', description: 'Más etiquetas de edificio en juego' },
    ],
  },
  {
    id: 'elysium',
    name: 'Elysium',
    description: 'Expansión Hellas & Elysium · el otro hemisferio',
    milestones: [
      {
        id: 'generalist',
        name: 'Generalist',
        description: 'Haber subido las 6 producciones al menos 1 paso',
        threshold: 6,
        value: (p, g) => productions(p).filter((v) => v > (g.options.corporateEra ? 0 : 1)).length,
      },
      {
        id: 'specialist',
        name: 'Specialist',
        description: 'Tener 10 de producción de algún recurso',
        threshold: 10,
        value: (p) => Math.max(...productions(p)),
      },
      {
        id: 'ecologist',
        name: 'Ecologist',
        description: 'Tener 4 etiquetas bio (planta, microbio, animal)',
        threshold: 4,
        ask: 'Etiquetas bio en juego (planta, microbio, animal)',
      },
      {
        id: 'tycoon',
        name: 'Tycoon',
        description: 'Tener 15 cartas de proyecto en juego (no eventos)',
        threshold: 15,
        ask: 'Cartas de proyecto en juego (sin eventos)',
      },
      { id: 'legend', name: 'Legend', description: 'Tener 5 eventos jugados', threshold: 5, ask: 'Eventos jugados' },
    ],
    awards: [
      { id: 'celebrity', name: 'Celebrity', description: 'Más cartas de proyecto de costo 20 o más' },
      {
        id: 'industrialist',
        name: 'Industrialist',
        description: 'Más acero y energía',
        metric: (p) => p.resources.steel + p.resources.energy,
      },
      { id: 'desert-settler', name: 'Desert Settler', description: 'Más losetas al sur del ecuador' },
      { id: 'estate-dealer', name: 'Estate Dealer', description: 'Más losetas junto a océanos' },
      { id: 'benefactor', name: 'Benefactor', description: 'Mayor TR', metric: (p) => p.tr },
    ],
  },
];

export const findBoard = (id: BoardId | undefined) => BOARDS.find((b) => b.id === id) ?? BOARDS[0];
