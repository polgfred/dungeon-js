import type { Event, Mode, Player, PromptOption, Tile } from '@dod/core';

/**
 * Wire protocol between the browser client and the table Durable Object, plus the
 * per-player view the server pushes. The view shape here is provisional (v0) and
 * expected to move as the client UI firms up.
 */

export type PlayerId = string;

// --- client -> server -------------------------------------------------------

export type ClientMessage =
  | { type: 'join'; playerId: PlayerId; name: string }
  | { type: 'setCharacter'; character: Player }
  | { type: 'start' }
  | { type: 'action'; command: string }
  | { type: 'cancel' }
  | { type: 'chat'; text: string };

// --- server -> client -------------------------------------------------------

export interface LobbyMember {
  id: PlayerId;
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface LobbyState {
  members: LobbyMember[];
  character: Player | null;
}

export interface PartyMember {
  id: PlayerId;
  name: string;
  alive: boolean;
  connected: boolean;
}

export interface Occupant {
  id: PlayerId;
  x: number;
  y: number;
}

export interface PromptView {
  text: string;
  options: PromptOption[];
  hasCancel: boolean;
}

export interface PlayerView {
  self: Player;
  mode: Mode;
  map: Tile[][];
  treasuresFound: number;
  ended: Mode | null;
  party: PartyMember[];
  occupants: Occupant[];
  monster: string | null;
  prompt: PromptView | null;
}

export type ServerMessage =
  | { type: 'lobby'; state: LobbyState }
  | { type: 'view'; view: PlayerView }
  | { type: 'events'; from: PlayerId; events: Event[] }
  | { type: 'chat'; from: PlayerId; name: string; text: string }
  | { type: 'error'; message: string };
