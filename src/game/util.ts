import { RESOURCES, type ResourceMap } from './types';

export function uid(): string {
  // randomUUID solo existe en contextos seguros (no al abrir por IP de la red local)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Mapa con todos los recursos en el mismo valor. */
export const filled = (n: number): ResourceMap =>
  Object.fromEntries(RESOURCES.map((k) => [k, n])) as ResourceMap;

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
