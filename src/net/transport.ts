import { Peer, type DataConnection } from 'peerjs';
import { DEAD_AFTER_MS, HEARTBEAT_MS, hostPeerId, type ClientMessage, type HostMessage } from './protocol';

export type LinkStatus = 'connecting' | 'online' | 'reconnecting' | 'error';

/** Espera entre reintentos: crece de a poco para no saturar el servidor, con tope. */
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 8000;
/** PeerJS a veces deja una conexión "abriéndose" para siempre: pasado esto se reintenta. */
const OPEN_TIMEOUT_MS = 10000;

/**
 * Servidor de PeerJS: el público por defecto. VITE_PEER_SERVER=host:puerto permite usar uno propio
 * (por ejemplo `npx peerjs --port 9000` para probar sin internet).
 */
const PEER_SERVER = import.meta.env.VITE_PEER_SERVER as string | undefined;
const peerOptions = () => {
  if (!PEER_SERVER) return {};
  const [host, port] = PEER_SERVER.split(':');
  return { host, port: Number(port) || 9000, path: '/', secure: false };
};

const backoff = (attempt: number) => Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** attempt);

/** Al volver a la app o recuperar la red no hace falta esperar al próximo reintento. */
function onWake(fn: () => void): () => void {
  const onVisible = () => document.visibilityState === 'visible' && fn();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', fn);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', fn);
  };
}

interface Link {
  conn: DataConnection;
  lastSeen: number;
}

/**
 * Lado anfitrión: registra el código en el servidor público de PeerJS y acepta
 * conexiones directas de los demás celulares.
 */
export class HostTransport {
  private peer: Peer | null = null;
  /** Conexiones abiertas, por clientId (se conoce tras el mensaje "hello"). */
  private byClient = new Map<string, Link>();
  private stopped = false;
  private retryTimer: number | undefined;
  private heartbeat: number | undefined;
  private attempt = 0;
  private offWake: (() => void) | null = null;

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
    this.offWake ??= onWake(() => this.wake());
    this.heartbeat ??= window.setInterval(() => this.beat(), HEARTBEAT_MS);
    this.open();
  }

  private open() {
    this.handlers.onStatus(this.attempt ? 'reconnecting' : 'connecting');
    const peer = new Peer(hostPeerId(this.code), peerOptions());
    this.peer = peer;

    peer.on('open', () => {
      this.attempt = 0;
      this.handlers.onStatus('online');
    });
    peer.on('connection', (conn) => this.accept(conn));
    // Se cortó el contacto con el servidor de PeerJS: las conexiones directas siguen andando,
    // pero sin servidor nadie nuevo (ni quien se reconecta) puede encontrar al anfitrión
    peer.on('disconnected', () => {
      if (this.stopped || peer !== this.peer) return;
      this.handlers.onStatus('reconnecting');
      this.schedule(() => !peer.destroyed && peer.reconnect());
    });
    peer.on('error', (err) => {
      if (this.stopped || peer !== this.peer) return;
      // Tras recargar la página el código puede seguir tomado unos segundos: reintentamos
      if (
        err.type === 'unavailable-id' ||
        err.type === 'network' ||
        err.type === 'server-error' ||
        err.type === 'socket-error' ||
        err.type === 'socket-closed'
      ) {
        this.handlers.onStatus('reconnecting', err.type === 'unavailable-id' ? 'El código todavía está en uso' : undefined);
        this.schedule(() => this.restart());
      }
    });
  }

  private schedule(fn: () => void) {
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => !this.stopped && fn(), backoff(this.attempt++));
  }

  /** Peer nuevo con el mismo código. Las conexiones directas de los jugadores no se tocan. */
  private restart() {
    this.peer?.destroy();
    this.open();
  }

  private wake() {
    if (this.stopped || !this.peer) return;
    // Volvió la red o la app: si el servidor nos había soltado, reintentar ya
    if (this.peer.destroyed) this.restart();
    else if (this.peer.disconnected) {
      window.clearTimeout(this.retryTimer);
      this.peer.reconnect();
    }
  }

  private accept(conn: DataConnection) {
    let clientId: string | null = null;
    conn.on('data', (data) => {
      const msg = data as ClientMessage;
      if (msg.t === 'hello') {
        clientId = msg.clientId;
        // Si el mismo celular se reconecta, la conexión vieja queda reemplazada
        const old = this.byClient.get(clientId);
        if (old && old.conn !== conn) old.conn.close();
        this.byClient.set(clientId, { conn, lastSeen: Date.now() });
      }
      if (!clientId) return;
      const link = this.byClient.get(clientId);
      if (link?.conn === conn) link.lastSeen = Date.now();
      if (msg.t !== 'ping') this.handlers.onMessage(clientId, msg);
    });
    const drop = () => {
      if (clientId && this.byClient.get(clientId)?.conn === conn) {
        this.byClient.delete(clientId);
        this.handlers.onDisconnect(clientId);
      }
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  /** Latido a todos; quien no da señales hace rato se da por desconectado (celular bloqueado, sin red). */
  private beat() {
    const now = Date.now();
    for (const [clientId, link] of this.byClient) {
      if (now - link.lastSeen > DEAD_AFTER_MS) {
        this.byClient.delete(clientId);
        link.conn.close();
        this.handlers.onDisconnect(clientId);
      } else if (link.conn.open) {
        link.conn.send({ t: 'ping' } satisfies HostMessage);
      }
    }
  }

  send(clientId: string, msg: HostMessage) {
    const link = this.byClient.get(clientId);
    if (link?.conn.open) link.conn.send(msg);
  }

  clients(): string[] {
    return [...this.byClient.keys()];
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.retryTimer);
    window.clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.offWake?.();
    this.offWake = null;
    this.byClient.forEach((l) => l.conn.close());
    this.byClient.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}

/**
 * Lado jugador: se conecta al celular anfitrión por el código y se reconecta solo si se corta.
 * Un latido en ambos sentidos detecta las conexiones que mueren sin avisar (pasa mucho en el
 * celular al bloquear la pantalla o cambiar de Wi-Fi a datos).
 */
export class ClientTransport {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private stopped = false;
  private retryTimer: number | undefined;
  private openTimer: number | undefined;
  private heartbeat: number | undefined;
  private lastSeen = 0;
  private attempt = 0;
  /** Ya estuvo conectado alguna vez: de ahí en más cada intento es una reconexión. */
  private everOpened = false;
  private offWake: (() => void) | null = null;

  constructor(
    private code: string,
    private clientId: string,
    private handlers: {
      onMessage: (msg: HostMessage) => void;
      onStatus: (status: LinkStatus, detail?: string) => void;
      /** La conexión quedó lista (también tras cada reconexión). */
      onOpen: () => void;
    },
  ) {}

  get isOpen() {
    return !!this.conn?.open;
  }

  start() {
    this.stopped = false;
    this.offWake ??= onWake(() => this.wake());
    this.heartbeat ??= window.setInterval(() => this.beat(), HEARTBEAT_MS);
    this.open();
  }

  private open() {
    this.handlers.onStatus(this.everOpened || this.attempt ? 'reconnecting' : 'connecting');
    const peer = new Peer(peerOptions());
    this.peer = peer;
    peer.on('open', () => this.connect(peer));
    peer.on('error', (err) => {
      if (this.stopped || peer !== this.peer) return;
      const detail =
        err.type === 'peer-unavailable'
          ? 'No se encuentra la partida. ¿El anfitrión tiene la app abierta?'
          : 'Problema de conexión, reintentando…';
      this.retry(detail);
    });
    peer.on('disconnected', () => {
      // Sin servidor la conexión directa puede seguir viva: solo hace falta para reconectar
      if (!this.stopped && peer === this.peer && !peer.destroyed) peer.reconnect();
    });
  }

  private connect(peer: Peer) {
    if (this.stopped || peer !== this.peer) return;
    const conn = peer.connect(hostPeerId(this.code), { reliable: true });
    this.conn = conn;
    window.clearTimeout(this.openTimer);
    this.openTimer = window.setTimeout(() => {
      if (this.conn === conn && !conn.open) this.retry('El anfitrión no responde, reintentando…');
    }, OPEN_TIMEOUT_MS);
    conn.on('open', () => {
      if (this.conn !== conn) return;
      window.clearTimeout(this.openTimer);
      this.attempt = 0;
      this.everOpened = true;
      this.lastSeen = Date.now();
      conn.send({ t: 'hello', clientId: this.clientId } satisfies ClientMessage);
      this.handlers.onStatus('online');
      this.handlers.onOpen();
    });
    conn.on('data', (data) => {
      if (this.conn !== conn) return;
      this.lastSeen = Date.now();
      const msg = data as HostMessage;
      if (msg.t !== 'ping') this.handlers.onMessage(msg);
    });
    const lost = () => {
      if (this.stopped || this.conn !== conn) return;
      this.retry('Se cortó la conexión con el anfitrión, reintentando…');
    };
    conn.on('close', lost);
    conn.on('error', lost);
  }

  /** Descarta la conexión actual y vuelve a intentar con un peer nuevo (lo más confiable en el celular). */
  private retry(detail: string, now = false) {
    if (this.stopped) return;
    this.handlers.onStatus('reconnecting', detail);
    const conn = this.conn;
    this.conn = null;
    window.clearTimeout(this.openTimer);
    window.clearTimeout(this.retryTimer);
    conn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.retryTimer = window.setTimeout(() => !this.stopped && this.open(), now ? 0 : backoff(this.attempt++));
  }

  private beat() {
    if (!this.conn?.open) return;
    if (Date.now() - this.lastSeen > DEAD_AFTER_MS) {
      this.retry('El anfitrión dejó de responder, reconectando…', true);
      return;
    }
    this.conn.send({ t: 'ping' } satisfies ClientMessage);
  }

  /** Al volver a la app: si hace rato que no hay noticias, reconectar sin esperar al latido. */
  private wake() {
    if (this.stopped) return;
    if (!this.conn?.open) {
      // Esperando el próximo reintento: adelantarlo. Si ya hay un intento en curso, dejarlo terminar
      if (!this.peer) this.retry('Reconectando…', true);
    } else if (Date.now() - this.lastSeen > HEARTBEAT_MS * 2) {
      this.retry('Reconectando…', true);
    }
  }

  /** Devuelve false si no se pudo mandar (sin conexión). */
  send(msg: ClientMessage): boolean {
    if (!this.conn?.open) return false;
    this.conn.send(msg);
    return true;
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.retryTimer);
    window.clearTimeout(this.openTimer);
    window.clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.offWake?.();
    this.offWake = null;
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
  }
}
