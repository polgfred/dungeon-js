import { describe, expect, it } from 'vitest';

import { Event } from '@dod/core';

import {
  tableReducer,
  initialTableState,
  type TableState,
} from '../src/client/store.js';
import type { PlayerView } from '../src/shared/index.js';

function makeView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    self: {} as PlayerView['self'],
    mode: 1 as PlayerView['mode'],
    map: [],
    treasuresFound: 0,
    ended: null,
    party: [],
    prompt: null,
    ...overrides,
  };
}

describe('tableReducer', () => {
  it('folds connection status without touching anything else', () => {
    const next = tableReducer(initialTableState, {
      type: 'status',
      status: 'open',
    });
    expect(next.status).toBe('open');
    expect(next.phase).toBe('lobby');
    expect(next).not.toBe(initialTableState);
  });

  it('replaces lobby state and clears a prior error', () => {
    const withError: TableState = { ...initialTableState, error: 'boom' };
    const lobby = { members: [{ id: 'a', name: 'Alice', ready: true }] };

    const next = tableReducer(withError, { type: 'lobby', state: lobby });

    expect(next.lobby).toEqual(lobby);
    expect(next.error).toBeNull();
  });

  it('advances to the play phase and stores the view', () => {
    const view = makeView({ treasuresFound: 3 });
    const next = tableReducer(initialTableState, { type: 'view', view });

    expect(next.phase).toBe('play');
    expect(next.view).toBe(view);
    expect(next.error).toBeNull();
  });

  it('appends events to the feed, flattened and attributed', () => {
    const next = tableReducer(initialTableState, {
      type: 'events',
      from: 'alice',
      events: [Event.info('a door creaks'), Event.loot('you find gold')],
    });

    expect(next.feed).toEqual([
      {
        kind: 'event',
        from: 'alice',
        event: { kind: 'INFO', text: 'a door creaks' },
      },
      {
        kind: 'event',
        from: 'alice',
        event: { kind: 'LOOT', text: 'you find gold' },
      },
    ]);
  });

  it('accumulates the feed across messages (it is the one growing channel)', () => {
    const first = tableReducer(initialTableState, {
      type: 'events',
      from: 'alice',
      events: [Event.info('one')],
    });
    const second = tableReducer(first, {
      type: 'events',
      from: 'bob',
      events: [Event.info('two')],
    });

    expect(second.feed.map((item) => item.from)).toEqual(['alice', 'bob']);
    expect(first.feed).toHaveLength(1); // prior state untouched (immutable fold)
  });

  it('appends chat to the same feed, attributed by name', () => {
    const next = tableReducer(initialTableState, {
      type: 'chat',
      from: 'bob',
      name: 'Bob',
      text: 'on my way',
    });
    expect(next.feed).toEqual([
      { kind: 'chat', from: 'bob', name: 'Bob', text: 'on my way' },
    ]);
  });

  it('surfaces server errors', () => {
    const next = tableReducer(initialTableState, {
      type: 'error',
      message: 'that table is full',
    });
    expect(next.error).toBe('that table is full');
  });
});
