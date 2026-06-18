import type { Event, Mode, PlayerSave, PromptOption, Tile } from '@dod/core';

/**
 * Wire protocol between the browser client and the table Durable Object, plus the
 * per-player view the server pushes. The view shape here is provisional (v0) and
 * expected to move as the client UI firms up.
 */

export type PlayerId = string;

// --- client -> server -------------------------------------------------------

export type ClientMessage =
  | Readonly<{ type: 'join'; playerId: PlayerId; name: string }>
  | Readonly<{ type: 'setCharacter'; character: PlayerSave }>
  | Readonly<{ type: 'start' }>
  | Readonly<{ type: 'action'; command: string }>
  | Readonly<{ type: 'cancel' }>
  | Readonly<{ type: 'chat'; text: string }>;

// --- server -> client -------------------------------------------------------

export type LobbyMember = Readonly<{
  id: PlayerId;
  name: string;
  ready: boolean;
  connected: boolean;
}>;

export type LobbyState = Readonly<{
  members: readonly LobbyMember[];
  character: PlayerSave | null;
}>;

export type PartyMember = Readonly<{
  id: PlayerId;
  name: string;
  alive: boolean;
  connected: boolean;
}>;

export type Occupant = Readonly<{
  id: PlayerId;
  x: number;
  y: number;
}>;

export type PromptView = Readonly<{
  text: string;
  options: readonly PromptOption[];
  hasCancel: boolean;
}>;

export type PlayerView = Readonly<{
  self: PlayerSave;
  mode: Mode;
  map: readonly Tile[][];
  treasuresFound: number;
  ended: Mode | null;
  party: readonly PartyMember[];
  occupants: readonly Occupant[];
  monster: string | null;
  prompt: PromptView | null;
}>;

export type ServerMessage =
  | Readonly<{ type: 'lobby'; state: LobbyState }>
  | Readonly<{ type: 'view'; view: PlayerView }>
  | Readonly<{ type: 'events'; from: PlayerId; events: Event[] }>
  | Readonly<{ type: 'chat'; from: PlayerId; name: string; text: string }>
  | Readonly<{ type: 'error'; message: string }>;
