import { AWARD_VP, MILESTONE_VP, findBoard, type AwardDef } from './boards';
import type { Game, Player, PlayerScore, ScoreKey } from './types';

export const emptyScore = (): PlayerScore => ({
  greeneries: 0,
  cities: 0,
  cityPoints: 0,
  cardPoints: 0,
  jovianCards: 0,
  jovianTags: 0,
});

export const SCORE_LABELS: Record<ScoreKey, string> = {
  greeneries: 'bosques',
  cities: 'ciudades',
  cityPoints: 'PV por ciudades',
  cardPoints: 'PV de cartas',
  jovianCards: 'cartas que puntúan por jovianos',
  jovianTags: 'etiquetas jovianas',
};

export interface ScoreBreakdown {
  tr: number;
  milestones: number;
  greeneries: number;
  cities: number;
  cards: number;
  jovian: number;
  awards: number;
  total: number;
}

/** Puntos de victoria actuales (los premios cuentan desde la puntuación final). */
export function scoreOf(g: Game, p: Player): ScoreBreakdown {
  const milestones = g.milestones.filter((m) => m.playerId === p.id).length * MILESTONE_VP;
  const s = p.score;
  const breakdown = {
    tr: p.tr,
    milestones,
    greeneries: s.greeneries,
    cities: s.cityPoints,
    cards: s.cardPoints,
    // Cada carta da 1 PV por etiqueta joviana
    jovian: s.jovianCards * s.jovianTags,
    awards: awardPoints(g, p.id),
  };
  return { ...breakdown, total: Object.values(breakdown).reduce((a, b) => a + b, 0) };
}

export interface AwardResult {
  award: AwardDef;
  /** Valor de cada jugador (undefined = falta informarlo). */
  values: Record<string, number | undefined>;
  complete: boolean;
  first: string[];
  second: string[];
}

/**
 * Premios financiados con sus ganadores: 5 PV a los primeros (empatados incluidos) y 2 a los
 * segundos, salvo que haya empate en el primer puesto o la partida sea de 2 jugadores.
 */
export function awardResults(g: Game): AwardResult[] {
  const board = findBoard(g.options.board);
  return g.awards.flatMap((claim): AwardResult[] => {
    const award = board.awards.find((a) => a.id === claim.id);
    if (!award) return [];
    const values: Record<string, number | undefined> = {};
    for (const p of g.players) values[p.id] = award.metric ? award.metric(p) : g.awardValues[award.id]?.[p.id];
    const complete = Object.values(values).every((v) => v !== undefined);
    if (!complete) return [{ award, values, complete, first: [], second: [] }];
    const entries = Object.entries(values) as [string, number][];
    const best = Math.max(...entries.map(([, v]) => v));
    const first = entries.filter(([, v]) => v === best).map(([id]) => id);
    let second: string[] = [];
    if (first.length === 1 && g.players.length > 2) {
      const rest = entries.filter(([, v]) => v < best);
      if (rest.length) {
        const next = Math.max(...rest.map(([, v]) => v));
        second = rest.filter(([, v]) => v === next).map(([id]) => id);
      }
    }
    return [{ award, values, complete, first, second }];
  });
}

function awardPoints(g: Game, playerId: string): number {
  if (g.phase !== 'scoring' && g.phase !== 'finished') return 0;
  return awardResults(g).reduce(
    (sum, r) => sum + (r.first.includes(playerId) ? AWARD_VP.first : r.second.includes(playerId) ? AWARD_VP.second : 0),
    0,
  );
}

/** Jugadores ordenados por PV; el desempate es por M€. */
export function finalRanking(g: Game): { p: Player; s: ScoreBreakdown }[] {
  return g.players
    .map((p) => ({ p, s: scoreOf(g, p) }))
    .sort((a, b) => b.s.total - a.s.total || b.p.resources.megacredits - a.p.resources.megacredits);
}
