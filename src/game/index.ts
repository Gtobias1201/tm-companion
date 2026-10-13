/**
 * API pública de las reglas del juego. Los componentes y el modo online importan desde acá
 * ('../game'), nunca de los módulos internos.
 */
export * from './actions';
export * from './payment';
export * from './setup';
export * from './state';
export { applyAction } from './reducer';
export { normalizeGame } from './normalize';
export { SCORE_LABELS, awardResults, finalRanking, scoreOf, type AwardResult, type ScoreBreakdown } from './scoring';
export { uid } from './util';
