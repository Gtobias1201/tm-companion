import { normalizeGame, type Action, type PlayerSetup } from '../game/logic';
import type { Game } from '../game/types';
import type { ClientMessage, HostMessage, Lobby } from '../net/protocol';
import { ClientTransport, type LinkStatus } from '../net/transport';
import { saveClientSession } from './session';

export interface ClientSnapshot {
  code: string;
  clientId: string;
  status: LinkStatus;
  statusDetail?: string;
  lobby: Lobby | null;
  game: Game | null;
  /** Jugador de este celular dentro de la partida. */
  me: string | null;
  canUndo: boolean;
  /** Error definitivo del anfitrión (sala llena, partida ya empezada...). */
  error: string | null;
  /** Jugadores con el celular conectado (según el anfitrión). */
  online: string[];
  /** Acciones tocadas sin conexión que se mandan al volver. */
  pending: number;
}

type Outgoing = Extract<ClientMessage, { seq: number }>;

/** Lo tocado sin conexión se reenvía al volver, salvo que haya quedado demasiado viejo. */
const PENDING_MAX_AGE_MS = 2 * 60_000;

/** Celular de un jugador invitado: manda sus acciones y muestra el estado que recibe del anfitrión. */
export class ClientController {
  private transport: ClientTransport;
  private listeners = new Set<() => void>();
  private snapshot: ClientSnapshot;
  /** Acciones mandadas que el anfitrión todavía no confirmó, en orden. */
  private outbox: Outgoing[] = [];
  private lastSeq = 0;

  constructor(code: string, clientId: string) {
    this.snapshot = {
      code,
      clientId,
      status: 'connecting',
      lobby: null,
      game: null,
      me: null,
      canUndo: false,
      error: null,
      online: [],
      pending: 0,
    };
    this.transport = new ClientTransport(code, clientId, {
      onMessage: (msg) => this.onMessage(msg),
      onStatus: (status, detail) => this.update({ status, statusDetail: detail }),
      onOpen: () => this.flush(),
    });
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private update(patch: Partial<ClientSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  start() {
    this.transport.start();
  }

  stop() {
    this.transport.stop();
  }

  private onMessage(msg: HostMessage) {
    switch (msg.t) {
      case 'lobby':
        saveClientSession({ code: this.snapshot.code, clientId: this.snapshot.clientId, name: msg.lobby.name });
        return this.update({ lobby: msg.lobby, game: null, error: null });
      case 'state':
        saveClientSession({ code: this.snapshot.code, clientId: this.snapshot.clientId, name: msg.game.name });
        this.outbox = this.outbox.filter((m) => m.seq > msg.ack);
        // Por si el reloj del celular se atrasó: lo próximo siempre va después de lo ya aplicado
        this.lastSeq = Math.max(this.lastSeq, msg.ack);
        return this.update({
          game: normalizeGame(msg.game),
          lobby: null,
          me: msg.playerId,
          canUndo: msg.canUndo,
          error: null,
          online: msg.online,
          pending: this.outbox.length,
        });
      case 'error':
        return this.update({ error: msg.message });
    }
  }

  /** Último armado mandado en la sala, para reenviarlo si se cortó antes de llegar. */
  private seat: Extract<ClientMessage, { t: 'seat' }> | null = null;

  sendSeat(setup: PlayerSetup, ready: boolean) {
    this.seat = { t: 'seat', setup, ready };
    this.transport.send(this.seat);
  }

  dispatch = (action: Action) => this.enqueue({ t: 'action', action, seq: this.nextSeq() });

  undo = () => this.enqueue({ t: 'undo', seq: this.nextSeq() });

  /**
   * Basado en la hora para que siga creciendo aunque se recargue la página: el anfitrión
   * ignora todo seq que ya aplicó, así que reenviar nunca repite una acción.
   */
  private nextSeq() {
    this.lastSeq = Math.max(Date.now(), this.lastSeq + 1);
    return this.lastSeq;
  }

  private enqueue(msg: Outgoing) {
    this.outbox.push(msg);
    this.transport.send(msg);
    this.update({ pending: this.outbox.length });
  }

  /** Tras (re)conectar: reenvía lo que el anfitrión no confirmó. */
  private flush() {
    if (this.seat && !this.snapshot.game) this.transport.send(this.seat);
    const now = Date.now();
    this.outbox = this.outbox.filter((m) => now - m.seq < PENDING_MAX_AGE_MS);
    this.outbox.forEach((m) => this.transport.send(m));
    this.update({ pending: this.outbox.length });
  }
}
