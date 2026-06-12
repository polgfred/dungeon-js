import type { Event, Mode, PlayerSave, Tile } from '@dod/core';

/**
 * Wire protocol between the browser client and the room Durable Object, plus the
 * per-player view the server pushes. The view shape here is provisional (v0) and
 * expected to move as the client UI firms up.
 */

export type PlayerId = string;

// --- client -> server -------------------------------------------------------

export type ClientMessage =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'setCharacter'; character: PlayerSave }
  | { type: 'start' }
  | { type: 'action'; command: string }
  | { type: 'cancel' };

// --- server -> client -------------------------------------------------------

export interface LobbyMember {
  id: PlayerId;
  name: string;
  ready: boolean;
}

export interface LobbyState {
  members: LobbyMember[];
}

export interface PartyMember {
  id: PlayerId;
  name: string;
  alive: boolean;
}

export interface PlayerView {
  self: PlayerSave;
  mode: Mode;
  map: Tile[][];
  treasuresFound: number;
  ended: Mode | null;
  party: PartyMember[];
}

export type ServerMessage =
  | { type: 'lobby'; state: LobbyState }
  | { type: 'view'; view: PlayerView }
  | { type: 'events'; from: PlayerId; events: Event[] }
  | { type: 'error'; message: string };
