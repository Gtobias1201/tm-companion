import { describe, expect, it } from 'vitest';
import {
  applyAction,
  awardResults,
  bestPayment,
  createGame,
  finalRanking,
  newPlayerSetup,
  normalizeGame,
  productionPreview,
  scoreOf,
  setupBalance,
  setupProblems,
  type Action,
  type GameSetup,
  type PlayerSetup,
} from './index';
import type { Game } from './types';

// ---------- Ayudas ----------

const seat = (n: number, patch: Partial<PlayerSetup> = {}): PlayerSetup => ({
  ...newPlayerSetup(n, 'red'),
  corporationId: null,
  initialCards: 0,
  startingMC: 50,
  ...patch,
});

function newGame(players = 2, opts: Partial<GameSetup> = {}): Game {
  return createGame({
    name: 'Prueba',
    players: Array.from({ length: players }, (_, i) => seat(i + 1)),
    corporateEra: true,
    venus: false,
    prelude: false,
    board: 'tharsis',
    ...opts,
  });
}

/** Aplica varias acciones seguidas y devuelve la partida final. */
const play = (g: Game, ...actions: Action[]) => actions.reduce(applyAction, g);

const p1 = (g: Game) => g.players[0];
const p2 = (g: Game) => g.players[1];

/** Pone recursos a mano sin pasar por el registro. */
function give(g: Game, i: number, res: Partial<Game['players'][number]['resources']>) {
  const next = structuredClone(g);
  Object.assign(next.players[i].resources, res);
  return next;
}

// ---------- Armado ----------

describe('armado de la partida', () => {
  it('arranca con TR 20 (14 en solitario) y producción según Era Corporativa', () => {
    expect(p1(newGame(2)).tr).toBe(20);
    expect(p1(newGame(1)).tr).toBe(14);
    expect(p1(newGame(2, { corporateEra: false })).production.steel).toBe(1);
    expect(p1(newGame(2)).production.steel).toBe(0);
  });

  it('aplica la corporación y cobra las cartas iniciales', () => {
    const g = createGame({
      name: 'x',
      players: [seat(1, { corporationId: 'ecoline', initialCards: 4 }), seat(2)],
      corporateEra: true,
      venus: false,
      prelude: false,
      board: 'tharsis',
    });
    const p = p1(g);
    expect(p.corporation).toBe('EcoLine');
    expect(p.resources.megacredits).toBe(36 - 4 * 3);
    expect(p.production.plants).toBe(2);
    expect(p.resources.plants).toBe(3);
    expect(p.greeneryCost).toBe(7);
  });

  it('Beginner arranca con las 10 cartas gratis', () => {
    const s = newPlayerSetup(1, 'red');
    expect(s.corporationId).toBe('beginner');
    expect(s.initialCards).toBe(10);
    expect(setupBalance(s)).toMatchObject({ afterCards: 42, cardPrice: 0 });
  });

  it('avisa si no alcanzan los M€ o faltan preludios', () => {
    expect(setupProblems(seat(1, { corporationId: 'phobolog', initialCards: 10 }), false)).toHaveLength(1);
    expect(setupProblems(seat(1), true)).toContain('Elegí 2 preludios.');
  });

  it('aplica preludios con sus parámetros y TR', () => {
    const g = createGame({
      name: 'x',
      players: [seat(1, { preludes: ['donation', 'great-aquifer'] }), seat(2)],
      corporateEra: true,
      venus: false,
      prelude: true,
      board: 'tharsis',
    });
    expect(g.globals.oceans).toBe(2);
    expect(p1(g).tr).toBe(22);
    expect(p1(g).resources.megacredits).toBe(50 + 21);
  });
});

// ---------- Parámetros globales ----------

describe('parámetros globales', () => {
  it('subir da +1 TR a quien sube y no pasa del máximo', () => {
    let g = newGame();
    g = play(g, { type: 'raiseGlobal', param: 'oceans', playerId: p1(g).id });
    expect(g.globals.oceans).toBe(1);
    expect(p1(g).tr).toBe(21);
    for (let i = 0; i < 12; i++) g = play(g, { type: 'raiseGlobal', param: 'oceans', playerId: p1(g).id });
    expect(g.globals.oceans).toBe(9);
    expect(p1(g).tr).toBe(29);
  });

  it('bonus de temperatura: calor a −24 y −20, océano a 0', () => {
    let g = newGame();
    const id = p1(g).id;
    for (let i = 0; i < 5; i++) g = play(g, { type: 'raiseGlobal', param: 'temperature', playerId: id });
    expect(g.globals.temperature).toBe(-20);
    expect(p1(g).production.heat).toBe(2);
    for (let i = 0; i < 10; i++) g = play(g, { type: 'raiseGlobal', param: 'temperature', playerId: id });
    expect(g.globals.temperature).toBe(0);
    expect(g.globals.oceans).toBe(1);
  });

  it('oxígeno al 8% sube la temperatura', () => {
    let g = newGame();
    for (let i = 0; i < 8; i++) g = play(g, { type: 'raiseGlobal', param: 'oxygen', playerId: p1(g).id });
    expect(g.globals.oxygen).toBe(8);
    expect(g.globals.temperature).toBe(-28);
    expect(p1(g).tr).toBe(29);
  });

  it('Venus: recordatorio de carta al 8% y +1 TR extra al 16%', () => {
    let g = newGame(2, { venus: true });
    for (let i = 0; i < 4; i++) g = play(g, { type: 'raiseGlobal', param: 'venus', playerId: p1(g).id });
    expect(g.reminder?.playerId).toBe(p1(g).id);
    for (let i = 0; i < 4; i++) g = play(g, { type: 'raiseGlobal', param: 'venus', playerId: p1(g).id });
    expect(g.globals.venus).toBe(16);
    expect(p1(g).tr).toBe(29);
  });

  it('corregir baja un paso y quita 1 TR', () => {
    let g = newGame();
    g = play(g, { type: 'raiseGlobal', param: 'oxygen', playerId: p1(g).id });
    g = play(g, { type: 'lowerGlobal', param: 'oxygen', playerId: p1(g).id });
    expect(g.globals.oxygen).toBe(0);
    expect(p1(g).tr).toBe(20);
    expect(play(g, { type: 'lowerGlobal', param: 'oxygen', playerId: p1(g).id })).toBe(g);
  });
});

// ---------- Acciones del jugador ----------

describe('acciones del jugador', () => {
  it('bosque con plantas: sube oxígeno, suma bosque y gasta una acción', () => {
    let g = give(newGame(), 0, { plants: 9 });
    g = play(g, { type: 'greenery', playerId: p1(g).id });
    expect(p1(g).resources.plants).toBe(1);
    expect(p1(g).score.greeneries).toBe(1);
    expect(g.globals.oxygen).toBe(1);
    expect(g.turn?.actions).toBe(1);
  });

  it('calor a temperatura', () => {
    let g = give(newGame(), 0, { heat: 8 });
    g = play(g, { type: 'heatToTemperature', playerId: p1(g).id });
    expect(p1(g).resources.heat).toBe(0);
    expect(g.globals.temperature).toBe(-28);
  });

  it('no deja actuar fuera de turno', () => {
    const g = give(newGame(), 1, { plants: 8 });
    expect(play(g, { type: 'greenery', playerId: p2(g).id })).toBe(g);
  });

  it('una acción sin efecto devuelve la misma partida (no ensucia el deshacer)', () => {
    const g = newGame();
    expect(play(g, { type: 'resource', playerId: p1(g).id, key: 'steel', delta: -1 })).toBe(g);
    expect(play(g, { type: 'tr', playerId: p1(g).id, delta: 0 })).toBe(g);
  });

  it('no modifica la partida original', () => {
    const g = newGame();
    const before = JSON.stringify(g);
    play(g, { type: 'tr', playerId: p1(g).id, delta: 3 });
    expect(JSON.stringify(g)).toBe(before);
  });

  it('la producción de M€ puede bajar hasta −5 y los recursos no quedan negativos', () => {
    let g = newGame();
    const id = p1(g).id;
    g = play(g, { type: 'production', playerId: id, key: 'megacredits', delta: -9 });
    expect(p1(g).production.megacredits).toBe(-5);
    g = play(g, { type: 'resource', playerId: id, key: 'megacredits', delta: -999 });
    expect(p1(g).resources.megacredits).toBe(0);
  });

  it('el registro agrupa toques seguidos del mismo contador', () => {
    let g = newGame();
    const n = g.log.length;
    g = play(g, { type: 'tr', playerId: p1(g).id, delta: 1 }, { type: 'tr', playerId: p1(g).id, delta: 1 });
    expect(g.log.length).toBe(n + 1);
    expect(g.log.at(-1)?.text).toContain('+2 TR');
  });
});

// ---------- Pagos ----------

describe('pagos', () => {
  it('elige el pago que no desperdicia y ahorra M€', () => {
    const g = give(newGame(), 0, { megacredits: 20, steel: 5, titanium: 2 });
    expect(bestPayment(p1(g), 10, { steel: true, titanium: false })).toEqual({ megacredits: 0, steel: 5, titanium: 0 });
    expect(bestPayment(p1(g), 9, { steel: false, titanium: true })).toEqual({ megacredits: 3, steel: 0, titanium: 2 });
    expect(bestPayment(p1(g), 100, { steel: true, titanium: true })).toBeNull();
  });

  it('pagar descuenta recursos y aplica el proyecto estándar', () => {
    let g = give(newGame(), 0, { megacredits: 30 });
    g = play(g, {
      type: 'pay',
      playerId: p1(g).id,
      cost: 11,
      payment: { megacredits: 11, steel: 0, titanium: 0 },
      projectId: 'power-plant',
    });
    expect(p1(g).resources.megacredits).toBe(19);
    expect(p1(g).production.energy).toBe(1);
  });

  it('CrediCor recupera 4 M€ en compras de 20 o más', () => {
    let g = createGame({
      name: 'x',
      players: [seat(1, { corporationId: 'credicor' }), seat(2)],
      corporateEra: true,
      venus: false,
      prelude: false,
      board: 'tharsis',
    });
    g = play(g, { type: 'pay', playerId: p1(g).id, cost: 20, payment: { megacredits: 20, steel: 0, titanium: 0 } });
    expect(p1(g).resources.megacredits).toBe(57 - 20 + 4);
  });

  it('rechaza pagos que no alcanzan', () => {
    const g = newGame();
    const pay: Action = { type: 'pay', playerId: p1(g).id, cost: 60, payment: { megacredits: 60, steel: 0, titanium: 0 } };
    expect(play(g, pay)).toBe(g);
  });
});

// ---------- Turnos y generaciones ----------

describe('turnos y generaciones', () => {
  it('dos acciones pasan el turno; pasar saltea al jugador', () => {
    let g = give(newGame(3), 0, { plants: 16 });
    const [a, b, c] = g.players.map((p) => p.id);
    g = play(g, { type: 'greenery', playerId: a }, { type: 'greenery', playerId: a });
    expect(g.turn?.playerId).toBe(b);
    g = play(g, { type: 'pass', playerId: b });
    expect(g.turn?.playerId).toBe(c);
    g = play(g, { type: 'pass', playerId: c });
    expect(g.turn?.playerId).toBe(a);
    g = play(g, { type: 'pass', playerId: a });
    expect(g.turn).toBeNull();
  });

  it('producción: energía a calor, M€ = TR + producción, y empieza la investigación', () => {
    let g = newGame();
    const id = p1(g).id;
    g = play(
      g,
      { type: 'production', playerId: id, key: 'megacredits', delta: 2 },
      { type: 'production', playerId: id, key: 'energy', delta: 1 },
      { type: 'resource', playerId: id, key: 'energy', delta: 3 },
    );
    expect(productionPreview(p1(g)).megacredits).toBe(22);
    const mc = p1(g).resources.megacredits;
    g = play(g, { type: 'productionPhase' });
    expect(p1(g).resources.megacredits).toBe(mc + 22);
    expect(p1(g).resources.heat).toBe(3);
    expect(p1(g).resources.energy).toBe(1);
    expect(g.generation).toBe(2);
    expect(g.researchPending).toBe(true);
    // El jugador inicial rota
    expect(g.turn?.playerId).toBe(p2(g).id);
  });

  it('investigación: cobra las cartas y libera el turno', () => {
    let g = play(newGame(), { type: 'productionPhase' });
    g = play(g, { type: 'research', purchases: { [p1(g).id]: 2, [p2(g).id]: 0 } });
    expect(g.researchPending).toBe(false);
    expect(p1(g).resources.megacredits).toBe(50 + 20 - 6);
  });

  it('con Marte terraformado la producción lleva a la fase final', () => {
    let g = newGame();
    g.globals = { temperature: 8, oxygen: 14, oceans: 9, venus: 0 };
    g = play(g, { type: 'productionPhase' });
    expect(g.phase).toBe('finalGreenery');
    expect(g.turn).toBeNull();
  });
});

// ---------- Hitos, premios y puntos ----------

describe('hitos, premios y puntos', () => {
  it('hito: exige el requisito y cobra 8 M€', () => {
    let g = newGame();
    const claim: Action = { type: 'claimMilestone', playerId: p1(g).id, milestoneId: 'terraformer' };
    expect(play(g, claim)).toBe(g);
    g = play(g, { type: 'tr', playerId: p1(g).id, delta: 15 }, claim);
    expect(g.milestones).toEqual([{ id: 'terraformer', playerId: p1(g).id }]);
    expect(p1(g).resources.megacredits).toBe(42);
    expect(scoreOf(g, p1(g)).milestones).toBe(5);
  });

  it('premios: cuestan 8, 14 y 20 y se reparten 5 y 2 PV', () => {
    let g = give(newGame(3), 0, { megacredits: 100 });
    const id = p1(g).id;
    g = play(g, { type: 'fundAward', playerId: id, awardId: 'banker' });
    expect(p1(g).resources.megacredits).toBe(92);
    g = structuredClone(g);
    g.players[0].production.megacredits = 5;
    g.players[1].production.megacredits = 3;
    g.players[2].production.megacredits = 1;
    g.phase = 'scoring';
    const [banker] = awardResults(g);
    expect(banker.first).toEqual([id]);
    expect(banker.second).toEqual([p2(g).id]);
    expect(scoreOf(g, p1(g)).awards).toBe(5);
  });

  it('ranking final por PV y desempate por M€', () => {
    let g = give(newGame(), 1, { megacredits: 99 });
    g = play(g, { type: 'score', playerId: p1(g).id, key: 'cardPoints', delta: 3 });
    expect(finalRanking(g).map((r) => r.p.id)).toEqual([p1(g).id, p2(g).id]);
    g = play(g, { type: 'score', playerId: p1(g).id, key: 'cardPoints', delta: -3 });
    expect(finalRanking(g)[0].p.id).toBe(p2(g).id);
  });

  it('jovianos: cartas × etiquetas', () => {
    let g = newGame();
    const id = p1(g).id;
    g = play(
      g,
      { type: 'score', playerId: id, key: 'jovianCards', delta: 2 },
      { type: 'score', playerId: id, key: 'jovianTags', delta: 3 },
    );
    expect(scoreOf(g, p1(g)).jovian).toBe(6);
  });
});

// ---------- Partidas guardadas ----------

describe('partidas guardadas de versiones anteriores', () => {
  it('completa los campos que faltan', () => {
    const g = newGame() as Partial<Game> & Game;
    const old = structuredClone(g) as unknown as Record<string, unknown>;
    delete old.milestones;
    delete old.turn;
    const p = (old.players as Record<string, unknown>[])[0];
    delete p.steelValue;
    delete p.discounts;
    const fixed = normalizeGame(old as unknown as Game);
    expect(fixed.milestones).toEqual([]);
    expect(fixed.turn?.playerId).toBe(g.players[0].id);
    expect(fixed.players[0].steelValue).toBe(2);
    expect(fixed.players[0].discounts).toEqual([]);
  });
});
