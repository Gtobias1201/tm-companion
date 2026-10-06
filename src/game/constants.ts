import type { CardTag, DiscountScope, GlobalKey, ResourceKey } from './types';

export const RESOURCE_INFO: Record<ResourceKey, { label: string; icon: string; color: string }> = {
  megacredits: { label: 'MegaCréditos', icon: 'M€', color: '#f2c14e' },
  steel: { label: 'Acero', icon: '⚒', color: '#b07a45' },
  titanium: { label: 'Titanio', icon: '✦', color: '#a9b4c2' },
  plants: { label: 'Plantas', icon: '🌿', color: '#5cb85c' },
  energy: { label: 'Energía', icon: '⚡', color: '#b07ce0' },
  heat: { label: 'Calor', icon: '🔥', color: '#ef6a3e' },
};

export const PLAYER_COLORS = [
  { id: 'red', label: 'Rojo', hex: '#d9412b' },
  { id: 'green', label: 'Verde', hex: '#3fa34d' },
  { id: 'blue', label: 'Azul', hex: '#3a7bd5' },
  { id: 'yellow', label: 'Amarillo', hex: '#e6c229' },
  { id: 'black', label: 'Negro', hex: '#6b6b6b' },
];

export function colorHex(id: string): string {
  return PLAYER_COLORS.find((c) => c.id === id)?.hex ?? '#888';
}

export const LIMITS: Record<GlobalKey, { min: number; max: number; step: number }> = {
  temperature: { min: -30, max: 8, step: 2 },
  oxygen: { min: 0, max: 14, step: 1 },
  oceans: { min: 0, max: 9, step: 1 },
  venus: { min: 0, max: 30, step: 2 },
};

export const formatTemperature = (t: number) => `${t > 0 ? '+' : ''}${t}°C`;

export const GLOBAL_INFO: Record<GlobalKey, { label: string; icon: string; color: string; format: (v: number) => string }> = {
  temperature: { label: 'Temperatura', icon: '🌡', color: '#ef6a3e', format: formatTemperature },
  oxygen: { label: 'Oxígeno', icon: 'O₂', color: '#7ccf6a', format: (v) => `${v}%` },
  oceans: { label: 'Océanos', icon: '🌊', color: '#4a9fe0', format: (v) => `${v}/9` },
  venus: { label: 'Venus', icon: '♀', color: '#d9a0e0', format: (v) => `${v}%` },
};

export const HEAT_PER_TEMPERATURE = 8;
export const DEFAULT_GREENERY_COST = 8;
export const DEFAULT_STEEL_VALUE = 2;
export const DEFAULT_TITANIUM_VALUE = 3;
export const SOLO_GENERATIONS = 14;

export const TAG_INFO: Record<CardTag, { label: string; icon: string; color: string }> = {
  building: { label: 'Edificio', icon: '🏗', color: '#b07a45' },
  space: { label: 'Espacio', icon: '🚀', color: '#a9b4c2' },
  earth: { label: 'Tierra', icon: '🌍', color: '#4a9fe0' },
  science: { label: 'Ciencia', icon: '🔬', color: '#e8e8e8' },
  power: { label: 'Energía', icon: '⚡', color: '#b07ce0' },
  venus: { label: 'Venus', icon: '♀', color: '#d9a0e0' },
};

export function scopeLabel(scope: DiscountScope): string {
  return scope === 'all' ? 'todas las cartas' : `cartas de ${TAG_INFO[scope].label.toLowerCase()}`;
}

export interface DiscountCard {
  id: string;
  name: string;
  expansion: string;
  amount: number;
  scope: DiscountScope;
}

/** Cartas y corporaciones cuyo efecto reduce el costo de otras cartas. */
export const DISCOUNT_CARDS: DiscountCard[] = [
  { id: 'space-station', name: 'Space Station', expansion: 'Base', amount: 2, scope: 'space' },
  { id: 'earth-office', name: 'Earth Office', expansion: 'Base', amount: 3, scope: 'earth' },
  { id: 'research-outpost', name: 'Research Outpost', expansion: 'Base', amount: 1, scope: 'all' },
  { id: 'earth-catapult', name: 'Earth Catapult', expansion: 'Base', amount: 2, scope: 'all' },
  { id: 'anti-gravity-technology', name: 'Anti-Gravity Technology', expansion: 'Base', amount: 2, scope: 'all' },
  { id: 'quantum-extractor', name: 'Quantum Extractor', expansion: 'Base', amount: 2, scope: 'space' },
  { id: 'mass-converter', name: 'Mass Converter', expansion: 'Base', amount: 2, scope: 'space' },
  { id: 'shuttles', name: 'Shuttles', expansion: 'Base', amount: 2, scope: 'space' },
  { id: 'warp-drive', name: 'Warp Drive', expansion: 'Base', amount: 4, scope: 'space' },
  { id: 'teractor', name: 'Teractor (corporación)', expansion: 'Corporaciones', amount: 3, scope: 'earth' },
  { id: 'thorgate', name: 'Thorgate (corporación)', expansion: 'Corporaciones', amount: 3, scope: 'power' },
  { id: 'cheung-shing-mars', name: 'Cheung Shing MARS (corporación)', expansion: 'Corporaciones', amount: 2, scope: 'building' },
  { id: 'valley-trust', name: 'Valley Trust (corporación)', expansion: 'Corporaciones', amount: 2, scope: 'science' },
  { id: 'venus-waystation', name: 'Venus Waystation', expansion: 'Venus Next', amount: 2, scope: 'venus' },
  { id: 'sky-docks', name: 'Sky Docks', expansion: 'Colonies', amount: 1, scope: 'all' },
];

export interface StandardProject {
  id: string;
  label: string;
  cost: number;
  /** La planta de energía cuenta como etiqueta de energía para Thorgate. */
  tags: CardTag[];
  venus?: boolean;
}

export const STANDARD_PROJECTS: StandardProject[] = [
  { id: 'power-plant', label: 'Planta de energía', cost: 11, tags: ['power'] },
  { id: 'asteroid', label: 'Asteroide', cost: 14, tags: [] },
  { id: 'air-scrapping', label: 'Depuración de aire', cost: 15, tags: [], venus: true },
  { id: 'aquifer', label: 'Acuífero', cost: 18, tags: [] },
  { id: 'greenery', label: 'Bosque', cost: 23, tags: [] },
  { id: 'city', label: 'Ciudad', cost: 25, tags: [] },
];
