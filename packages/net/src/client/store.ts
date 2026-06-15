import type { Event, PlayerSave } from '@dod/core';

import type {
  LobbyState,
  PlayerId,
  PlayerView,
  ServerMessage,
} from '../shared/index.js';
import { TableConnection, type ConnectionStatus } from './connection.js';

export type TablePhase = 'lobby' | 'play';

export type FeedItem =
  | { kind: 'event'; from: PlayerId; event: Event }
  | { kind: 'chat'; from: PlayerId; name: string; text: string };

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

const MAX_FEED = 256;

function appendFeed(feed: FeedItem[], items: FeedItem[]): FeedItem[] {
  const next = [...feed, ...items];
  return next.length > MAX_FEED ? next.slice(-MAX_FEED) : next;
}

export function tableReducer(
  state: TableState,
  action: TableAction
): TableState {
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
        feed: appendFeed(
          state.feed,
          action.events.map((event) => ({
            kind: 'event' as const,
            from: action.from,
            event,
          }))
        ),
      };
    case 'chat':
      return {
        ...state,
        feed: appendFeed(state.feed, [
          {
            kind: 'chat',
            from: action.from,
            name: action.name,
            text: action.text,
          },
        ]),
      };
    case 'error':
      return { ...state, error: action.message };
  }
}

/** An observable wrapper over a TableConnection. */
export class TableStore {
  private state: TableState = initialTableState;
  private connection: TableConnection | null = null;
  private readonly events = new EventTarget();

  constructor(private readonly url: string) {}

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
    this.events.dispatchEvent(new CustomEvent('change'));
  }

  subscribe = (listener: () => void) => {
    this.events.addEventListener('change', listener);
    return () => {
      this.events.removeEventListener('change', listener);
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
  chat = (text: string) => {
    this.connection?.chat(text);
  };
}
