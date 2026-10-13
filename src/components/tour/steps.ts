import { ACTIONS_PER_TURN, createGame, newPlayerSetup } from '../../game';
import type { Game, GlobalKey } from '../../game/types';

/** Recorrido de bienvenida: sin React, para poder probarlo con los tests de las reglas. */

const STORAGE_KEY = 'tm-companion:tour';

type TourStorage = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): TourStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function tourSeen(storage = defaultStorage()): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) === 'seen';
  } catch {
    // storage bloqueado: mejor no insistir con el tour en cada apertura
    return true;
  }
}

export function markTourSeen(storage = defaultStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, 'seen');
  } catch {
    // modo privado o sin espacio: el tour puede volver a aparecer, no es grave
  }
}

/** Valor de `data-tour` del elemento que se ilumina en cada paso. */
export type TourTarget = 'play' | 'resources' | 'tr' | 'globals' | 'turn' | 'views' | 'bottombar' | 'help';

export interface TourStep {
  /** Qué pantalla se ve detrás: el inicio o la partida de práctica. */
  screen: 'home' | 'game';
  /** Sin destino, la burbuja va centrada sobre la pantalla oscurecida. */
  target?: TourTarget;
  title: string;
  text: string;
  /**
   * Pasos para probar un gesto: el elemento iluminado se puede tocar y el paso avanza solo
   * cuando la partida cambió como se pidió (comparando con cómo estaba al llegar al paso).
   */
  done?: (before: Game, now: Game) => boolean;
}

const tr = (g: Game) => g.players[0].tr;
const GLOBALS: GlobalKey[] = ['temperature', 'oxygen', 'oceans', 'venus'];

export const TOUR_STEPS: TourStep[] = [
  {
    screen: 'home',
    title: 'Bienvenido a TM Companion',
    text: 'La app reemplaza el tablero de jugador, los cubos y la libreta de puntos de Terraforming Mars. Te muestro lo básico en un minuto.',
  },
  {
    screen: 'home',
    target: 'play',
    title: 'Tres formas de jugar',
    text: 'Online: tu celular es el anfitrión y los demás se unen con un código o QR. Unirme: entrás a la partida de otro. Solitaria: todo en este celular, sin conexión.',
  },
  {
    screen: 'game',
    title: 'Partida de práctica',
    text: 'Abrí una partida de prueba para que veas la pantalla de juego. No se guarda: tocá lo que quieras.',
  },
  {
    screen: 'game',
    target: 'resources',
    title: 'Tus recursos',
    text: 'Cada color es un recurso, como en el tablero. En la franja de arriba está la producción con − y +. Abajo, lo que tenés: tocá el número para sumar o gastar una cantidad.',
  },
  {
    screen: 'game',
    target: 'tr',
    title: 'Nivel de terraformación',
    text: 'Tocá la placa de TR para sumar 1. Probalo ahora.',
    done: (before, now) => tr(now) > tr(before),
  },
  {
    screen: 'game',
    target: 'tr',
    title: 'Corregir un error',
    text: 'Para restar 1, deslizá la placa hacia la izquierda hasta que aparezca el −1 y soltá. Probalo.',
    done: (before, now) => tr(now) < tr(before),
  },
  {
    screen: 'game',
    target: 'globals',
    title: 'Parámetros globales',
    text: 'Temperatura, oxígeno y océanos. Tocá uno para subirlo y te suma 1 TR. Deslizar a la izquierda también corrige acá. Probá con uno.',
    done: (before, now) => GLOBALS.some((k) => now.globals[k] > before.globals[k]),
  },
  {
    screen: 'game',
    target: 'turn',
    title: 'Tu turno',
    text: `Hacés hasta ${ACTIONS_PER_TURN} acciones por turno. Pagar, bosque y temperatura se cuentan solas; para las demás tocá «Acción». Después «Terminar», o «Pasar» cuando no juegues más en la generación.`,
  },
  {
    screen: 'game',
    target: 'views',
    title: 'Hitos, premios y puntos',
    text: 'Acá cambiás entre tu tablero, los hitos y premios, y el conteo de puntos.',
  },
  {
    screen: 'game',
    target: 'bottombar',
    title: 'Deshacer y producción',
    text: '«Deshacer» vuelve atrás lo último que hiciste. Cuando todos pasaron, «Fase de producción» cobra lo de cada uno y arranca la generación siguiente.',
  },
  {
    screen: 'game',
    target: 'help',
    title: 'La guía está siempre acá',
    text: 'Si te olvidás de algo, el signo de pregunta abre la guía completa. Desde la guía del inicio podés repetir este recorrido. ¡A terraformar!',
  },
];

/** Partida de una sola persona con Beginner Corporation, para practicar sin tocar las guardadas. */
export function createDemoGame(): Game {
  return createGame({
    name: 'Partida de práctica',
    players: [{ ...newPlayerSetup(1, 'red'), name: 'Vos' }],
    corporateEra: false,
    venus: false,
    prelude: false,
    board: 'tharsis',
  });
}
