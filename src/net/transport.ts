import { Peer, type DataConnection } from 'peerjs';
import { hostPeerId, type ClientMessage, type HostMessage } from './protocol';

export type LinkStatus = 'connecting' | 'online' | 'reconnecting' | 'error';

const RETRY_MS = 2500;

/**
 * Lado anfitrión: registra el código en el servidor público de PeerJS y acepta
 * conexiones directas de los demás celulares.
 */
export class HostTransport {
  private peer: Peer | null = null;
  /** Conexiones abiertas, por clientId (se conoce tras el mensaje "hello"). */
  private byClient = new Map<string, DataConnection>();
  private stopped = false;
  private retryTimer: number | undefined;

  constructor(
    private code: string,
    private handlers: {
      onMessage: (clientId: string, msg: ClientMessage) => void;
      onDisconnect: (clientId: string) => void;
      onStatus: (status: LinkStatus, detail?: string) => void;
    },
  ) {}

  start() {
    this.stopped = false;
    this.handlers.onStatus('connecting');
    const peer = new Peer(hostPeerId(this.code));
    this.peer = peer;

    peer.on('open', () => this.handlers.onStatus('online'));
    peer.on('connection', (conn) => this.accept(conn));
    // Se cortó el contacto con el servidor de PeerJS: las conexiones directas siguen andando
    peer.on('disconnected', () => {
      if (this.stopped) return;
      this.handlers.onStatus('reconnecting');
      this.retryTimer = window.setTimeout(() => !this.stopped && !peer.destroyed && peer.reconnect(), RETRY_MS);
    });
    peer.on('error', (err) => {
      if (this.stopped) return;
      // Tras recargar la página el código puede seguir tomado unos segundos: reintentamos
      if (err.type === 'unavailable-id' || err.type === 'network' || err.type === 'server-error') {
        this.handlers.onStatus('reconnecting', err.type === 'unavailable-id' ? 'El código todavía está en uso' : undefined);
        this.restart();
      }
    });
  }

  private restart() {
    window.clearTimeout(this.retryTimer);
    this.peer?.destroy();
    this.retryTimer = window.setTimeout(() => !this.stopped && this.start(), RETRY_MS);
  }

  private accept(conn: DataConnection) {
    let clientId: string | null = null;
    conn.on('data', (data) => {
      const msg = data as ClientMessage;
      if (msg.t === 'hello') {
        clientId = msg.clientId;
        // Si el mismo celular se reconecta, la conexión vieja queda reemplazada
        const old = this.byClient.get(clientId);
        if (old && old !== conn) old.close();
        this.byClient.set(clientId, conn);
      }
      if (clientId) this.handlers.onMessage(clientId, msg);
    });
    conn.on('close', () => {
      if (clientId && this.byClient.get(clientId) === conn) {
        this.byClient.delete(clientId);
        this.handlers.onDisconnect(clientId);
      }
    });
  }

  send(clientId: string, msg: HostMessage) {
    const conn = this.byClient.get(clientId);
    if (conn?.open) conn.send(msg);
  }

  clients(): string[] {
    return [...this.byClient.keys()];
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.retryTimer);
    this.byClient.forEach((c) => c.close());
    this.byClient.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}

/** Lado jugador: se conecta al celular anfitrión por el código y se reconecta solo si se corta. */
export class ClientTransport {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private stopped = false;
  private retryTimer: number | undefined;

  constructor(
    private code: string,
    private clientId: string,
    private handlers: {
      onMessage: (msg: HostMessage) => void;
      onStatus: (status: LinkStatus, detail?: string) => void;
    },
  ) {}

  start() {
    this.stopped = false;
    this.handlers.onStatus('connecting');
    const peer = new Peer();
    this.peer = peer;
    peer.on('open', () => this.connect());
    peer.on('error', (err) => {
      if (this.stopped) return;
      const detail =
        err.type === 'peer-unavailable'
          ? 'No se encuentra la partida. ¿El anfitrión tiene la app abierta?'
          : 'Problema de conexión, reintentando…';
      this.handlers.onStatus('reconnecting', detail);
      this.scheduleRetry();
    });
    peer.on('disconnected', () => {
      if (!this.stopped && !peer.destroyed) peer.reconnect();
    });
  }

  private connect() {
    if (!this.peer || this.stopped) return;
    const conn = this.peer.connect(hostPeerId(this.code), { reliable: true });
    this.conn = conn;
    conn.on('open', () => {
      this.handlers.onStatus('online');
      conn.send({ t: 'hello', clientId: this.clientId } satisfies ClientMessage);
    });
    conn.on('data', (data) => this.handlers.onMessage(data as HostMessage));
    conn.on('close', () => {
      if (this.stopped || this.conn !== conn) return;
      this.handlers.onStatus('reconnecting', 'Se cortó la conexión con el anfitrión, reintentando…');
      this.scheduleRetry();
    });
  }

  private scheduleRetry() {
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => {
      if (this.stopped) return;
      // Peer nuevo en cada intento: es lo más confiable tras cortes de red en el celular
      this.conn = null;
      this.peer?.destroy();
      this.start();
    }, RETRY_MS);
  }

  send(msg: ClientMessage) {
    if (this.conn?.open) this.conn.send(msg);
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.retryTimer);
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
  }
}
