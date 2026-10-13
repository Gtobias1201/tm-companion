import { GLOBAL_INFO, LIMITS, formatTemperature } from './constants';
import { log } from './log';
import type { Game, GlobalKey, Player } from './types';

/**
 * Parámetros globales con sus bonus del tablero. Cada función agrega a `notes` lo que pasó
 * (para el historial) y devuelve false si el parámetro ya estaba al máximo.
 */

export function raise(g: Game, param: GlobalKey, p: Player, notes: string[]): boolean {
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

export function raiseTemperature(g: Game, p: Player, notes: string[]): boolean {
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

export function raiseOxygen(g: Game, p: Player, notes: string[]): boolean {
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

export function placeOcean(g: Game, p: Player, notes: string[]): boolean {
  if (g.globals.oceans >= LIMITS.oceans.max) return false;
  g.globals.oceans += 1;
  p.tr += 1;
  notes.push(`océano ${g.globals.oceans}/9 (+1 TR)`);
  return true;
}

export function raiseVenus(g: Game, p: Player, notes: string[]): boolean {
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

/**
 * Corrección manual: baja el parámetro un paso y le quita 1 TR a quien corrige, simétrico a
 * subirlo. Los bonus que ya se dieron (calor, océano, carta) se ajustan a mano si hace falta.
 */
export function lowerGlobal(g: Game, param: GlobalKey, p: Player): boolean {
  const L = LIMITS[param];
  if (g.globals[param] <= L.min) return false;
  g.globals[param] -= L.step;
  p.tr = Math.max(0, p.tr - 1);
  log(g, `${p.name}: corrección de ${GLOBAL_INFO[param].label} a ${GLOBAL_INFO[param].format(g.globals[param])} (−1 TR)`);
  return true;
}
