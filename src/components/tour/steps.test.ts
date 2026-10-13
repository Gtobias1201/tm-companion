import { describe, expect, it } from 'vitest';
import { applyAction } from '../../game';
import { TOUR_STEPS, createDemoGame, markTourSeen, tourSeen } from './steps';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('recorrido de bienvenida', () => {
  it('se recuerda que ya se vio', () => {
    const storage = memoryStorage();
    expect(tourSeen(storage)).toBe(false);
    markTourSeen(storage);
    expect(tourSeen(storage)).toBe(true);
  });

  it('con el almacenamiento bloqueado no insiste en cada apertura', () => {
    const blocked = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(tourSeen(blocked)).toBe(true);
    expect(() => markTourSeen(blocked)).not.toThrow();
  });

  it('la partida de práctica arranca en tu turno con Beginner Corporation', () => {
    const g = createDemoGame();
    expect(g.players).toHaveLength(1);
    expect(g.players[0].corporationId).toBe('beginner');
    expect(g.turn?.playerId).toBe(g.players[0].id);
    expect(g.phase).toBe('playing');
  });

  it('empieza en el inicio y después pasa a la partida', () => {
    const screens = TOUR_STEPS.map((s) => s.screen);
    expect(screens[0]).toBe('home');
    expect(screens.indexOf('game')).toBeGreaterThan(0);
    expect(screens.slice(screens.indexOf('game'))).not.toContain('home');
  });

  it('los pasos de gestos avanzan solo cuando se hizo el gesto pedido', () => {
    const step = (title: string) => TOUR_STEPS.find((s) => s.title === title)!;
    const start = createDemoGame();
    const pid = start.players[0].id;

    const raised = applyAction(start, { type: 'tr', playerId: pid, delta: 1 });
    expect(step('Nivel de terraformación').done!(start, start)).toBe(false);
    expect(step('Nivel de terraformación').done!(start, raised)).toBe(true);

    const lowered = applyAction(raised, { type: 'tr', playerId: pid, delta: -1 });
    expect(step('Corregir un error').done!(raised, lowered)).toBe(true);
    expect(step('Corregir un error').done!(start, raised)).toBe(false);

    const ocean = applyAction(start, { type: 'raiseGlobal', param: 'oceans', playerId: pid });
    expect(step('Parámetros globales').done!(start, ocean)).toBe(true);
    expect(step('Parámetros globales').done!(start, raised)).toBe(false);
  });
});
