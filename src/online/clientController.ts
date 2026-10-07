import { normalizeGame, type Action, type PlayerSetup } from '../game/logic';
import type { Game } from '../game/types';
import type { HostMessage, Lobby } from '../net/protocol';
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
}

/** Celular de un jugador invitado: manda sus acciones y muestra el estado que recibe del anfitrión. */
export class ClientController {
  private transport: ClientTransport;
  private listeners = new Set<() => void>();
  private snapshot: ClientSnapshot;

  constructor(code: string, clientId: string) {
    this.snapshot = { code, clientId, status: 'connecting', lobby: null, game: null, me: null, canUndo: false, error: null };
    this.transport = new ClientTransport(code, clientId, {
      onMessage: (msg) => this.onMessage(msg),
      onStatus: (status, detail) => this.update({ status, statusDetail: detail }),
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
        return this.update({
          game: normalizeGame(msg.game),
          lobby: null,
          me: msg.playerId,
          canUndo: msg.canUndo,
          error: null,
        });
      case 'error':
        return this.update({ error: msg.message });
    }
  }

  sendSeat(setup: PlayerSetup, ready: boolean) {
    this.transport.send({ t: 'seat', setup, ready });
  }

  dispatch = (action: Action) => this.transport.send({ t: 'action', action });

  undo = () => this.transport.send({ t: 'undo' });
}
