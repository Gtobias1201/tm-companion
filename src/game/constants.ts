import type { GlobalKey, ResourceKey } from './types';

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
export const SOLO_GENERATIONS = 14;
