import { log } from './log';
import { awardResults, finalRanking } from './scoring';
import { firstPlayer, isLastGeneration, isSolo, maxCardsToBuy, productionPreview, soloWon } from './state';
import { RESOURCES, type Game } from './types';

/** Fase de producción: reparte lo producido y abre la investigación (o termina la partida). */
export function productionPhase(g: Game): boolean {
  if (g.phase !== 'playing') return false;
  const ending = isLastGeneration(g);
  for (const p of g.players) {
    const gains = productionPreview(p);
    for (const k of RESOURCES) {
      if (k !== 'energy') p.resources[k] = Math.max(0, p.resources[k] + gains[k]);
    }
    // la energía sobrante pasó a calor: solo queda la nueva producción
    p.resources.energy = Math.max(0, p.production.energy);
  }
  log(g, `Fin de la generación ${g.generation}: producción aplicada`);
  if (ending) {
    g.phase = 'finalGreenery';
    g.turn = null;
    g.passed = [];
    g.turnNotice = null;
    g.researchPending = false;
    log(g, 'Fin de la partida: bosques finales y puntuación');
    return true;
  }
  g.generation += 1;
  g.activePlayerId = firstPlayer(g).id;
  g.turn = { playerId: g.activePlayerId, actions: 0 };
  g.passed = [];
  g.actionsThisGen = {};
  g.turnNotice = null;
  g.researchPending = true;
  g.researchDone = [];
  return true;
}

/** Fase de investigación: cada jugador paga las cartas que se queda de las 4 que robó. */
export function researchPhase(g: Game, purchases: Record<string, number>): boolean {
  if (!g.researchPending) return false;
  for (const p of g.players) {
    const n = purchases[p.id] ?? 0;
    if (n < 0 || n > maxCardsToBuy(p)) return false;
  }
  const bought: string[] = [];
  for (const p of g.players) {
    const n = purchases[p.id] ?? 0;
    p.resources.megacredits -= n * p.cardCost;
    bought.push(`${p.name} ${n} carta${n === 1 ? '' : 's'}${n ? ` (−${n * p.cardCost} M€)` : ''}`);
  }
  g.researchPending = false;
  log(g, `Investigación: ${bought.join(' · ')}`);
  return true;
}

/** Bosques finales → puntuación → partida terminada. */
export function advancePhase(g: Game): boolean {
  if (g.phase === 'finalGreenery') {
    g.phase = 'scoring';
    log(g, 'Puntuación final');
    return true;
  }
  if (g.phase === 'scoring') {
    if (awardResults(g).some((r) => !r.complete)) return false;
    g.phase = 'finished';
    const [winner] = finalRanking(g);
    log(g, isSolo(g) ? (soloWon(g) ? 'Partida ganada: Marte terraformado' : 'Partida perdida: Marte sin terraformar') : `Ganó ${winner.p.name} con ${winner.s.total} PV`);
    return true;
  }
  return false;
}
