import type { Game } from './types';
import { uid } from './util';

/** Entradas del historial que se conservan por partida. */
const MAX_LOG = 400;
/** Cambios repetidos del mismo valor dentro de esta ventana se suman en una sola línea. */
const MERGE_WINDOW_MS = 20_000;

export function log(g: Game, text: string) {
  g.log.push({ id: uid(), generation: g.generation, text, at: Date.now() });
  if (g.log.length > MAX_LOG) g.log.splice(0, g.log.length - MAX_LOG);
}

/** Como log, pero acumula los +1/−1 seguidos del mismo valor ("+3 TR" en vez de tres líneas). */
export function logDelta(g: Game, mergeKey: string, delta: number, format: (total: number) => string) {
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
