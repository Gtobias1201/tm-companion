import type { BoardId } from '../game/boards';
import type { Action, PlayerSetup } from '../game/logic';
import type { Game } from '../game/types';

/** Prefijo para que los ids de PeerJS no choquen con los de otras apps del servidor público. */
export const PEER_PREFIX = 'tmcompanion-v1-';
export const MAX_ONLINE_PLAYERS = 5;
/** clientId fijo del celular anfitrión. */
export const HOST_CLIENT_ID = 'host';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

/** Código corto de invitación, sin letras confusas (O/0, I/1). */
export function newInviteCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export const normalizeCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);

export const isValidCode = (code: string) => code.length === CODE_LENGTH && [...code].every((c) => CODE_CHARS.includes(c));

export const hostPeerId = (code: string) => PEER_PREFIX + code;

/** Link que abre la app directo en "Unirme" con el código cargado. */
export const inviteLink = (code: string) => `${location.href.split('#')[0]}#join=${code}`;

export interface LobbyOptions {
  corporateEra: boolean;
  venus: boolean;
  prelude: boolean;
  board: BoardId;
}

export interface LobbySeat {
  clientId: string;
  setup: PlayerSetup;
  ready: boolean;
  connected: boolean;
}

/** Sala de espera: cada jugador arma su corporación, cartas y preludios desde su celular. */
export interface Lobby {
  code: string;
  name: string;
  options: LobbyOptions;
  seats: LobbySeat[];
}

export type ClientMessage =
  | { t: 'hello'; clientId: string }
  | { t: 'seat'; setup: PlayerSetup; ready: boolean }
  | { t: 'action'; action: Action }
  | { t: 'undo' };

export type HostMessage =
  | { t: 'lobby'; lobby: Lobby }
  | { t: 'state'; game: Game; playerId: string; canUndo: boolean }
  | { t: 'error'; message: string };
