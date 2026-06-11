import type { PlayerSave } from '@dod/core';

import type { ClientMessage, PlayerId, ServerMessage } from '../shared/index.js';

// Re-export the protocol/view types the UI renders, so the app has one import.
export type {
  ClientMessage,
  ServerMessage,
  LobbyState,
  LobbyMember,
  PlayerView,
  PartyMember,
  PlayerId,
} from '../shared/index.js';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface RoomConnectionOptions {
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

/**
 * A typed WebSocket connection to a room's Durable Object. Thin on purpose: it
 * (de)serializes the protocol and surfaces status; reconnection and reactive
 * state are the consumer's job (e.g. a React hook).
 */
export class RoomConnection {
  private readonly ws: WebSocket;
  private readonly onStatus?: (status: ConnectionStatus) => void;

  constructor(url: string, options: RoomConnectionOptions) {
    this.onStatus = options.onStatus;
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => this.onStatus?.('open'));
    this.ws.addEventListener('close', () => this.onStatus?.('closed'));
    this.ws.addEventListener('message', (event) => {
      try {
        options.onMessage(JSON.parse(String(event.data)) as ServerMessage);
      } catch {
        // Ignore malformed frames rather than tearing down the connection.
      }
    });
    this.onStatus?.('connecting');
  }

  private send(message: ClientMessage) {
    this.ws.send(JSON.stringify(message));
  }

  join(playerId: PlayerId, name: string) {
    this.send({ type: 'join', playerId, name });
  }

  setCharacter(character: PlayerSave) {
    this.send({ type: 'setCharacter', character });
  }

  start() {
    this.send({ type: 'start' });
  }

  action(command: string) {
    this.send({ type: 'action', command });
  }

  cancel() {
    this.send({ type: 'cancel' });
  }

  close() {
    this.ws.close();
  }
}

const PLAYER_ID_KEY = 'dod.playerId';

/**
 * A stable per-browser player id, persisted to localStorage — so a refresh or a
 * reconnect resumes the same seat in a room rather than arriving as a new player.
 */
export function loadPlayerId(storage: Storage = localStorage): PlayerId {
  let id = storage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}
