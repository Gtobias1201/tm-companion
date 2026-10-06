import type { CardTag, DiscountScope, GlobalKey, ResourceKey } from './types';

// Los colores son variables CSS: cambian solos entre el tema claro (Arena) y el oscuro (Noche).
export const RESOURCE_INFO: Record<ResourceKey, { label: string; color: string }> = {
  megacredits: { label: 'MegaCréditos', color: 'var(--c-mc)' },
  steel: { label: 'Acero', color: 'var(--c-steel)' },
  titanium: { label: 'Titanio', color: 'var(--c-titanium)' },
  plants: { label: 'Plantas', color: 'var(--c-plants)' },
  energy: { label: 'Energía', color: 'var(--c-energy)' },
  heat: { label: 'Calor', color: 'var(--c-heat)' },
};

export const PLAYER_COLORS = [
  { id: 'red', label: 'Rojo', hex: '#D85A30' },
  { id: 'green', label: 'Verde', hex: '#639922' },
  { id: 'blue', label: 'Azul', hex: '#378ADD' },
  { id: 'yellow', label: 'Amarillo', hex: '#EF9F27' },
  { id: 'black', label: 'Negro', hex: '#5F5E5A' },
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

export const GLOBAL_INFO: Record<GlobalKey, { label: string; color: string; format: (v: number) => string }> = {
  temperature: { label: 'Temperatura', color: 'var(--c-temp)', format: formatTemperature },
  oxygen: { label: 'Oxígeno', color: 'var(--c-oxygen)', format: (v) => `${v}%` },
  oceans: { label: 'Océanos', color: 'var(--c-ocean)', format: (v) => `${v}/9` },
  venus: { label: 'Venus', color: 'var(--c-venus)', format: (v) => `${v}%` },
};

export const HEAT_PER_TEMPERATURE = 8;
export const DEFAULT_GREENERY_COST = 8;
export const DEFAULT_STEEL_VALUE = 2;
export const DEFAULT_TITANIUM_VALUE = 3;
export const DEFAULT_CARD_COST = 3;
export const RESEARCH_CARDS = 4;
export const SOLO_GENERATIONS = 14;

export const TAG_INFO: Record<CardTag, { label: string; color: string }> = {
  building: { label: 'Edificio', color: 'var(--c-steel)' },
  space: { label: 'Espacio', color: 'var(--c-titanium)' },
  earth: { label: 'Tierra', color: 'var(--c-ocean)' },
  science: { label: 'Ciencia', color: 'var(--text)' },
  power: { label: 'Energía', color: 'var(--c-energy)' },
  venus: { label: 'Venus', color: 'var(--c-venus)' },
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
