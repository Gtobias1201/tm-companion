import { findCorporation } from '../game/catalog';
import { PLAYER_COLORS } from '../game/constants';
import {
  applyAction,
  createGame,
  isViewOnly,
  newPlayerSetup,
  normalizeGame,
  setupProblems,
  type Action,
  type PlayerSetup,
} from '../game/logic';
import type { Game } from '../game/types';
import {
  HOST_CLIENT_ID,
  MAX_ONLINE_PLAYERS,
  type ClientMessage,
  type Lobby,
  type LobbyOptions,
} from '../net/protocol';
import { HostTransport, type LinkStatus } from '../net/transport';

export interface HostSnapshot {
  code: string;
  status: LinkStatus;
  statusDetail?: string;
  /** clientIds conectados en este momento (sin contar al anfitrión). */
  connected: string[];
  lobby: Lobby | null;
  game: Game | null;
  /** Jugador del anfitrión dentro de la partida. */
  me: string | null;
  canUndoMine: boolean;
  canUndoAny: boolean;
}

interface UndoEntry {
  game: Game;
  /** Jugador que hizo el cambio. */
  by: string;
}

const UNDO_LIMIT = 50;

/** Motivos por los que todavía no se puede empezar la partida desde la sala. */
export function lobbyProblems(lobby: Lobby): string[] {
  const problems: string[] = [];
  if (lobby.seats.length < 2) problems.push('Esperando a que se una al menos otro jugador.');
  const waiting = lobby.seats.filter((s) => !s.ready).map((s) => s.setup.name);
  if (waiting.length) problems.push(`Falta que confirmen: ${waiting.join(', ')}.`);
  const offline = lobby.seats.filter((s) => !s.connected).map((s) => s.setup.name);
  if (offline.length) problems.push(`Desconectados: ${offline.join(', ')}.`);
  for (const s of lobby.seats) {
    if (setupProblems(s.setup, lobby.options.prelude).length) problems.push(`${s.setup.name} tiene avisos pendientes.`);
  }
  // Cada uno elige en su celular al mismo tiempo: puede haber choques
  const corps = lobby.seats.map((s) => s.setup.corporationId).filter((id): id is string => !!id && !findCorporation(id)?.repeatable);
  if (new Set(corps).size < corps.length) problems.push('Hay corporaciones repetidas.');
  const preludes = lobby.options.prelude ? lobby.seats.flatMap((s) => s.setup.preludes.filter(Boolean)) : [];
  if (new Set(preludes).size < preludes.length) problems.push('Hay preludios repetidos.');
  return problems;
}

/**
 * Estado del celular anfitrión: sala de espera y partida. Es la única copia "oficial":
 * los demás celulares mandan acciones y reciben el estado actualizado.
 */
export class HostController {
  private transport: HostTransport;
  private listeners = new Set<() => void>();
  private lobby: Lobby | null = null;
  private game: Game | null = null;
  private undo: UndoEntry[] = [];
  private status: LinkStatus = 'connecting';
  private statusDetail: string | undefined;
  private snapshot: HostSnapshot;

  constructor(
    private code: string,
    private opts: { resume?: Game; onSave: (game: Game) => void },
  ) {
    if (opts.resume) {
      this.game = normalizeGame(structuredClone(opts.resume));
    } else {
      this.lobby = {
        code,
        name: `Partida ${new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}`,
        options: { corporateEra: true, venus: false, prelude: false, board: 'tharsis' },
        seats: [{ clientId: HOST_CLIENT_ID, setup: newPlayerSetup(1, PLAYER_COLORS[0].id), ready: false, connected: true }],
      };
    }
    this.transport = new HostTransport(code, {
      onMessage: (clientId, msg) => this.handle(clientId, msg),
      onDisconnect: (clientId) => this.onDisconnect(clientId),
      onStatus: (status, detail) => {
        this.status = status;
        this.statusDetail = detail;
        this.emit();
      },
    });
    this.snapshot = this.buildSnapshot();
  }

  // ---------- Suscripción para React (useSyncExternalStore) ----------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((fn) => fn());
  }

  private buildSnapshot(): HostSnapshot {
    const me = this.game?.online?.members[HOST_CLIENT_ID] ?? null;
    const top = this.undo[this.undo.length - 1];
    return {
      code: this.code,
      status: this.status,
      statusDetail: this.statusDetail,
      connected: this.transport.clients(),
      lobby: this.lobby,
      game: this.game,
      me,
      canUndoMine: !!top && top.by === me,
      canUndoAny: !!top,
    };
  }

  start() {
    this.transport.start();
  }

  stop() {
    this.transport.stop();
  }

  // ---------- Sala de espera ----------

  updateLobby(patch: { name?: string; options?: Partial<LobbyOptions> }) {
    if (!this.lobby) return;
    this.lobby = {
      ...this.lobby,
      name: patch.name ?? this.lobby.name,
      options: { ...this.lobby.options, ...patch.options },
      // Al cambiar opciones, todos tienen que volver a confirmar
      seats: this.lobby.seats.map((s) => (patch.options ? { ...s, ready: false } : s)),
    };
    this.publish();
  }

  updateSeat(clientId: string, setup: PlayerSetup, ready: boolean) {
    if (!this.lobby) return;
    this.lobby = {
      ...this.lobby,
      seats: this.lobby.seats.map((s) => (s.clientId === clientId ? { ...s, setup, ready } : s)),
    };
    this.publish();
  }

  removeSeat(clientId: string) {
    if (!this.lobby || clientId === HOST_CLIENT_ID) return;
    this.lobby = { ...this.lobby, seats: this.lobby.seats.filter((s) => s.clientId !== clientId) };
    this.transport.send(clientId, { t: 'error', message: 'El anfitrión te sacó de la sala.' });
    this.publish();
  }

  startGame() {
    if (!this.lobby || lobbyProblems(this.lobby).length) return;
    const { name, options, seats } = this.lobby;
    const game = createGame({ name, players: seats.map((s) => s.setup), ...options });
    // Mismo orden que en la sala: el asiento i es el jugador i
    game.online = {
      code: this.code,
      members: Object.fromEntries(seats.map((s, i) => [s.clientId, game.players[i].id])),
    };
    this.game = game;
    this.lobby = null;
    this.undo = [];
    this.opts.onSave(game);
    this.publish();
  }

  // ---------- Partida ----------

  /** Acción del propio anfitrión. */
  dispatch = (action: Action) => this.applyFrom(HOST_CLIENT_ID, action);

  undoMine = () => {
    const me = this.game?.online?.members[HOST_CLIENT_ID];
    if (me) this.undoFor(me);
  };

  /** Deshacer general: solo el anfitrión, para corregir errores de cualquiera. */
  undoAny = () => {
    const prev = this.undo.pop();
    if (!prev) return;
    this.commit(prev.game);
  };

  private applyFrom(clientId: string, action: Action) {
    const game = this.game;
    const playerId = game?.online?.members[clientId];
    if (!game || !playerId || !isAllowed(game, action, playerId, clientId === HOST_CLIENT_ID)) return;
    const next = applyAction(game, action);
    if (next === game) return;
    this.undo = [...this.undo, { game, by: playerId }].slice(-UNDO_LIMIT);
    this.commit(next);
  }

  /** Cada jugador solo puede deshacer su propia última acción. */
  private undoFor(playerId: string) {
    const top = this.undo[this.undo.length - 1];
    if (!top || top.by !== playerId) return;
    this.undo.pop();
    this.commit(top.game);
  }

  private commit(game: Game) {
    this.game = game;
    this.opts.onSave(game);
    this.publish();
  }

  // ---------- Mensajes de los demás celulares ----------

  private handle(clientId: string, msg: ClientMessage) {
    switch (msg.t) {
      case 'hello':
        return this.onHello(clientId);
      case 'seat':
        return this.updateSeat(clientId, msg.setup, msg.ready);
      case 'action':
        return this.applyFrom(clientId, msg.action);
      case 'undo': {
        const playerId = this.game?.online?.members[clientId];
        if (playerId) this.undoFor(playerId);
        return;
      }
    }
  }

  private onHello(clientId: string) {
    if (this.game) {
      if (this.game.online?.members[clientId]) this.sendState(clientId);
      else this.transport.send(clientId, { t: 'error', message: 'La partida ya empezó sin vos.' });
      this.emit();
      return;
    }
    if (!this.lobby) return;
    const existing = this.lobby.seats.find((s) => s.clientId === clientId);
    if (existing) {
      this.lobby = {
        ...this.lobby,
        seats: this.lobby.seats.map((s) => (s.clientId === clientId ? { ...s, connected: true } : s)),
      };
    } else if (this.lobby.seats.length < MAX_ONLINE_PLAYERS) {
      const used = new Set(this.lobby.seats.map((s) => s.setup.color));
      const color = PLAYER_COLORS.find((c) => !used.has(c.id))?.id ?? PLAYER_COLORS[0].id;
      const seat = { clientId, setup: newPlayerSetup(this.lobby.seats.length + 1, color), ready: false, connected: true };
      this.lobby = { ...this.lobby, seats: [...this.lobby.seats, seat] };
    } else {
      this.transport.send(clientId, { t: 'error', message: 'La sala está llena (máximo 5 jugadores).' });
      return;
    }
    this.publish();
  }

  private onDisconnect(clientId: string) {
    if (this.lobby) {
      this.lobby = {
        ...this.lobby,
        seats: this.lobby.seats.map((s) => (s.clientId === clientId ? { ...s, connected: false } : s)),
      };
      this.publish();
    } else {
      this.emit();
    }
  }

  /** Envía la sala o la partida a todos los conectados y avisa a la pantalla del anfitrión. */
  private publish() {
    for (const clientId of this.transport.clients()) {
      if (this.lobby) this.transport.send(clientId, { t: 'lobby', lobby: this.lobby });
      else this.sendState(clientId);
    }
    this.emit();
  }

  private sendState(clientId: string) {
    const playerId = this.game?.online?.members[clientId];
    if (!this.game || !playerId) return;
    const top = this.undo[this.undo.length - 1];
    this.transport.send(clientId, { t: 'state', game: this.game, playerId, canUndo: !!top && top.by === playerId });
  }
}

/** Qué puede hacer cada celular: solo actuar sobre su propio jugador. */
function isAllowed(game: Game, action: Action, playerId: string, isHost: boolean): boolean {
  if (isViewOnly(action)) return false;
  switch (action.type) {
    case 'research':
      return false;
    case 'productionPhase':
      // Recién cuando todos pasaron
      return game.phase === 'playing' && !game.turn;
    case 'advancePhase':
      return isHost;
    default:
      return 'playerId' in action && action.playerId === playerId;
  }
}
