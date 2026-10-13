import { HEAT_PER_TEMPERATURE, LIMITS, RESOURCE_INFO } from './constants';
import { AWARD_COSTS, MAX_MILESTONES, MILESTONE_COST, MILESTONE_VP, findBoard } from './boards';
import { CREDICOR_REBATE } from './catalog';
import { TURN_ACTIONS, isViewOnly, type Action } from './actions';
import { lowerGlobal, placeOcean, raise, raiseOxygen, raiseTemperature, raiseVenus } from './globals';
import { log, logDelta } from './log';
import { normalizeGame } from './normalize';
import { canAfford, describePayment, paymentValue } from './payment';
import { advancePhase, productionPhase, researchPhase } from './phases';
import { SCORE_LABELS } from './scoring';
import { isTurnOf, maxCardsToBuy, productionMin } from './state';
import { countAction, advanceTurn } from './turns';
import type { Game, Player } from './types';
import { signed, uid } from './util';

/** Aplica una acción y devuelve una partida nueva (o la misma si no cambió nada). */
export function applyAction(game: Game, action: Action): Game {
  // Completa campos nuevos también en partidas que ya estaban abiertas antes de actualizar
  const g = normalizeGame(structuredClone(game));
  if (TURN_ACTIONS.has(action.type) && 'playerId' in action && !isTurnOf(g, action.playerId)) return game;
  if (!isViewOnly(action)) g.turnNotice = null;
  if (!run(g, action)) return game;
  if (TURN_ACTIONS.has(action.type) && 'playerId' in action) countAction(g, action.playerId);
  g.updatedAt = Date.now();
  return g;
}

function run(g: Game, a: Action): boolean {
  if (a.type === 'productionPhase') return productionPhase(g);
  if (a.type === 'advancePhase') return advancePhase(g);
  if (a.type === 'setAwardValue') {
    if (g.phase !== 'scoring' || a.value < 0) return false;
    g.awardValues[a.awardId] = { ...g.awardValues[a.awardId], [a.playerId]: Math.round(a.value) };
    return true;
  }
  if (a.type === 'research') return researchPhase(g, a.purchases);
  if (a.type === 'dismissReminder') {
    if (!g.reminder) return false;
    g.reminder = null;
    return true;
  }
  if (a.type === 'dismissNotice') {
    if (!g.turnNotice) return false;
    g.turnNotice = null;
    return true;
  }

  const p = g.players.find((x) => x.id === a.playerId);
  if (!p) return false;

  switch (a.type) {
    case 'registerAction':
      log(g, `${p.name}: otra acción`);
      return true;

    case 'endTurn': {
      if (!g.turn || g.turn.playerId !== p.id || g.turn.actions === 0) return false;
      log(g, `${p.name}: terminó su turno con 1 acción`);
      advanceTurn(g, p.id, 'end');
      return true;
    }

    case 'pass': {
      if (!isTurnOf(g, p.id)) return false;
      g.passed.push(p.id);
      log(g, `${p.name}: pasó`);
      advanceTurn(g, p.id, 'pass');
      return true;
    }

    case 'setActive':
      if (g.activePlayerId === p.id) return false;
      g.activePlayerId = p.id;
      return true;

    case 'resource': {
      const prev = p.resources[a.key];
      const next = Math.max(0, prev + a.delta);
      if (next === prev) return false;
      p.resources[a.key] = next;
      const label = RESOURCE_INFO[a.key].label;
      logDelta(g, `res:${p.id}:${a.key}`, next - prev, (n) => `${p.name}: ${signed(n)} ${label}`);
      return true;
    }

    case 'production': {
      const prev = p.production[a.key];
      const next = Math.max(productionMin(a.key), prev + a.delta);
      if (next === prev) return false;
      p.production[a.key] = next;
      const label = RESOURCE_INFO[a.key].label;
      logDelta(g, `prod:${p.id}:${a.key}`, next - prev, (n) => `${p.name}: ${signed(n)} producción de ${label}`);
      return true;
    }

    case 'tr': {
      const next = Math.max(0, p.tr + a.delta);
      if (next === p.tr) return false;
      const d = next - p.tr;
      p.tr = next;
      logDelta(g, `tr:${p.id}`, d, (n) => `${p.name}: ${signed(n)} TR`);
      return true;
    }

    case 'lowerGlobal':
      return lowerGlobal(g, a.param, p);

    case 'raiseGlobal': {
      const notes: string[] = [];
      if (!raise(g, a.param, p, notes)) return false;
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'greenery': {
      if (p.resources.plants < p.greeneryCost) return false;
      p.resources.plants -= p.greeneryCost;
      const notes = [`bosque (−${p.greeneryCost} plantas)`];
      p.score.greeneries += 1;
      if (!raiseOxygen(g, p, notes)) notes.push('oxígeno al máximo, sin TR');
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'heatToTemperature': {
      if (p.resources.heat < HEAT_PER_TEMPERATURE) return false;
      if (g.globals.temperature >= LIMITS.temperature.max) return false;
      p.resources.heat -= HEAT_PER_TEMPERATURE;
      const notes = [`−${HEAT_PER_TEMPERATURE} calor`];
      raiseTemperature(g, p, notes);
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'pay': {
      const { megacredits, steel, titanium } = a.payment;
      const listCost = a.listCost ?? a.cost;
      if (listCost <= 0 || a.cost < 0 || !canAfford(p, a.payment) || paymentValue(p, a.payment) < a.cost) return false;
      p.resources.megacredits -= megacredits;
      p.resources.steel -= steel;
      p.resources.titanium -= titanium;
      const what = a.label ? `${a.label} ` : '';
      const saved = listCost - a.cost;
      const discount = saved > 0 ? ` (lista ${listCost}, −${saved} por descuentos)` : '';
      const effects: string[] = [];
      if (a.projectId) applyStandardProject(g, p, a.projectId, effects);
      let rebate = '';
      if (p.corporationId === 'credicor' && listCost >= CREDICOR_REBATE.minCost) {
        p.resources.megacredits += CREDICOR_REBATE.amount;
        rebate = ` · CrediCor +${CREDICOR_REBATE.amount} M€`;
      }
      const effectText = effects.length ? ` · ${effects.join(' · ')}` : '';
      log(g, `${p.name}: pagó ${what}${a.cost} M€${discount} con ${describePayment(a.payment)}${rebate}${effectText}`);
      return true;
    }

    case 'researchBuy': {
      if (!g.researchPending || g.researchDone.includes(p.id)) return false;
      const n = Math.round(a.cards);
      if (n < 0 || n > maxCardsToBuy(p)) return false;
      const cost = n * p.cardCost;
      p.resources.megacredits -= cost;
      g.researchDone.push(p.id);
      log(g, `Investigación: ${p.name} ${n} carta${n === 1 ? '' : 's'}${n ? ` (−${cost} M€)` : ''}`);
      if (g.players.every((x) => g.researchDone.includes(x.id))) g.researchPending = false;
      return true;
    }

    case 'placeTile': {
      if (g.phase !== 'playing') return false;
      const notes: string[] = [];
      if (a.tile === 'greenery') {
        p.score.greeneries += 1;
        notes.push('loseta de bosque');
        // Colocar un bosque siempre sube el oxígeno, venga de donde venga
        if (!raiseOxygen(g, p, notes)) notes.push('oxígeno al máximo, sin TR');
      } else if (a.tile === 'city') {
        p.score.cities += 1;
        notes.push('loseta de ciudad');
      } else {
        notes.push('loseta de océano');
        if (!placeOcean(g, p, notes)) return false;
      }
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'finalGreenery': {
      if (g.phase !== 'finalGreenery' || p.resources.plants < p.greeneryCost) return false;
      p.resources.plants -= p.greeneryCost;
      p.score.greeneries += 1;
      const notes = [`bosque final (−${p.greeneryCost} plantas)`];
      raiseOxygen(g, p, notes);
      log(g, `${p.name}: ${notes.join(' · ')}`);
      return true;
    }

    case 'claimMilestone': {
      const board = findBoard(g.options.board);
      const def = board.milestones.find((m) => m.id === a.milestoneId);
      if (!def || g.milestones.length >= MAX_MILESTONES || g.milestones.some((m) => m.id === def.id)) return false;
      if (p.resources.megacredits < MILESTONE_COST) return false;
      const value = def.value ? def.value(p, g) : a.declared;
      if (value === undefined || value < def.threshold) return false;
      p.resources.megacredits -= MILESTONE_COST;
      g.milestones.push({ id: def.id, playerId: p.id });
      log(g, `${p.name}: reclamó el hito ${def.name} (−${MILESTONE_COST} M€, +${MILESTONE_VP} PV)`);
      return true;
    }

    case 'fundAward': {
      const board = findBoard(g.options.board);
      const def = board.awards.find((x) => x.id === a.awardId);
      const cost = AWARD_COSTS[g.awards.length];
      if (!def || cost === undefined || g.awards.some((x) => x.id === def.id)) return false;
      if (p.resources.megacredits < cost) return false;
      p.resources.megacredits -= cost;
      g.awards.push({ id: def.id, playerId: p.id });
      log(g, `${p.name}: financió el premio ${def.name} (−${cost} M€)`);
      return true;
    }

    case 'score': {
      const prev = p.score[a.key];
      const next = Math.max(0, prev + a.delta);
      if (next === prev) return false;
      p.score[a.key] = next;
      logDelta(g, `score:${p.id}:${a.key}`, next - prev, (n) => `${p.name}: ${n > 0 ? '+' : ''}${n} ${SCORE_LABELS[a.key]}`);
      return true;
    }

    case 'addDiscount': {
      const { cardId } = a.discount;
      if (cardId && p.discounts.some((d) => d.cardId === cardId)) return false;
      const amount = Math.max(1, Math.round(a.discount.amount));
      p.discounts.push({ ...a.discount, amount, id: uid() });
      log(g, `${p.name}: agregó descuento ${a.discount.name} (−${amount})`);
      return true;
    }

    case 'removeDiscount': {
      const d = p.discounts.find((x) => x.id === a.discountId);
      if (!d) return false;
      p.discounts = p.discounts.filter((x) => x.id !== a.discountId);
      log(g, `${p.name}: quitó descuento ${d.name}`);
      return true;
    }

    case 'updatePlayer': {
      const patch = { ...a.patch };
      for (const k of ['greeneryCost', 'steelValue', 'titaniumValue'] as const) {
        if (patch[k] !== undefined) patch[k] = Math.max(1, Math.round(patch[k]));
      }
      if (patch.cardCost !== undefined) patch.cardCost = Math.max(0, Math.round(patch.cardCost));
      Object.assign(p, patch);
      return true;
    }
  }
}

/** Aplica el efecto de un proyecto estándar ya pagado. */
function applyStandardProject(g: Game, p: Player, projectId: string, notes: string[]) {
  switch (projectId) {
    case 'power-plant':
      p.production.energy += 1;
      notes.push('+1 producción de energía');
      return;
    case 'asteroid':
      raiseTemperature(g, p, notes);
      return;
    case 'air-scrapping':
      raiseVenus(g, p, notes);
      return;
    case 'aquifer':
      placeOcean(g, p, notes);
      return;
    case 'greenery':
      p.score.greeneries += 1;
      notes.push('bosque');
      raiseOxygen(g, p, notes);
      return;
    case 'city':
      p.score.cities += 1;
      p.production.megacredits += 1;
      notes.push('ciudad · +1 producción de M€');
      return;
  }
}
