import type { Event, PlayerSave } from '@dod/core';

import type {
  LobbyState,
  PlayerId,
  PlayerView,
  ServerMessage,
} from '../shared/index.js';
import { TableConnection, type ConnectionStatus } from './connection.js';

export type TablePhase = 'lobby' | 'play';

export type FeedItem = { kind: 'event'; from: PlayerId; event: Event };

export interface TableState {
  status: ConnectionStatus;
  phase: TablePhase;
  lobby: LobbyState | null;
  view: PlayerView | null;
  feed: FeedItem[];
  error: string | null;
}

export const initialTableState: TableState = {
  status: 'connecting',
  phase: 'lobby',
  lobby: null,
  view: null,
  feed: [],
  error: null,
};

export type TableAction =
  | ServerMessage
  | { type: 'status'; status: ConnectionStatus };

export function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'status':
      return { ...state, status: action.status };
    case 'lobby':
      return { ...state, lobby: action.state, error: null };
    case 'view':
      return { ...state, phase: 'play', view: action.view, error: null };
    case 'events':
      return {
        ...state,
        feed: [
          ...state.feed,
          ...action.events.map((event) => ({
            kind: 'event' as const,
            from: action.from,
            event,
          })),
        ],
      };
    case 'error':
      return { ...state, error: action.message };
  }
}

/** An observable wrapper over a TableConnection. */
export class TableStore {
  private state: TableState = initialTableState;
  private readonly listeners = new Set<() => void>();
  private connection: TableConnection | null = null;

  constructor(private readonly url: string) {}

  /** Open the socket. Idempotent; pair with disconnect() in an effect cleanup. */
  connect() {
    if (this.connection) return;
    this.connection = new TableConnection(this.url, {
      onMessage: (message) => this.dispatch(message),
      onStatus: (status) => this.dispatch({ type: 'status', status }),
    });
  }

  disconnect() {
    this.connection?.close();
    this.connection = null;
  }

  private dispatch(action: TableAction) {
    const next = tableReducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  // Action passthroughs — stable identities (arrow fields), safe to pass as props.
  join = (playerId: PlayerId, name: string) => {
    this.connection?.join(playerId, name);
  };
  setCharacter = (character: PlayerSave) => {
    this.connection?.setCharacter(character);
  };
  start = () => {
    this.connection?.start();
  };
  action = (command: string) => {
    this.connection?.action(command);
  };
  cancel = () => {
    this.connection?.cancel();
  };
}
