import type { PlayerSave } from '@dod/core';

import type {
  ClientMessage,
  PlayerId,
  ServerMessage,
} from '../shared/index.js';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface TableConnectionOptions {
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

/** Reconnect backoff: 0.5s, 1s, 2s, 4s, 8s, then capped at 15s. */
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 15_000;

/**
 * A typed, self-healing WebSocket connection to a table's Durable Object.
 * Reconnects on its own with exponential backoff, retrying indefinitely.
 */
export class TableConnection {
  private ws!: WebSocket;
  private readonly onStatus?: (status: ConnectionStatus) => void;
  private readonly onMessage: (message: ServerMessage) => void;
  private listeners: AbortController | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;

  constructor(
    private readonly url: string,
    options: TableConnectionOptions
  ) {
    this.onStatus = options.onStatus;
    this.onMessage = options.onMessage;
    this.open();
  }

  private open() {
    // Detach the previous socket so its late events (even a legit close from a
    // reconnect) can't drive status — a swapped-out socket goes dark.
    this.listeners?.abort();
    this.listeners = new AbortController();
    const signal = this.listeners.signal;

    this.ws = new WebSocket(this.url);
    this.ws.addEventListener(
      'open',
      () => {
        this.attempt = 0; // healthy again — next drop backs off from scratch
        this.onStatus?.('open');
      },
      { signal }
    );
    this.ws.addEventListener(
      'close',
      () => {
        this.onStatus?.('closed');
        this.scheduleReconnect();
      },
      { signal }
    );
    this.ws.addEventListener(
      'message',
      (event) => {
        try {
          this.onMessage(JSON.parse(String(event.data)) as ServerMessage);
        } catch {
          // Ignore malformed frames rather than tearing down the connection.
        }
      },
      { signal }
    );
    this.onStatus?.('connecting');
  }

  private scheduleReconnect() {
    const delay =
      this.attempt < 5
        ? RECONNECT_BASE_MS * 2 ** this.attempt
        : RECONNECT_MAX_MS;
    this.attempt += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private send(message: ClientMessage) {
    // Make sure the socket is really open
    if (this.ws.readyState !== WebSocket.OPEN) return;
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

  chat(text: string) {
    this.send({ type: 'chat', text });
  }

  close() {
    // Detach first, so the impending 'close' event can't schedule a reconnect.
    this.listeners?.abort();
    clearTimeout(this.retryTimer);
    this.ws.close();
  }
}

const PLAYER_ID_KEY = 'dod.playerId';

/** A stable per-browser player id, persisted to localStorage */
export function loadPlayerId(storage: Storage = localStorage): PlayerId {
  let id = storage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}
