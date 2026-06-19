import { describe, expect, it } from 'vitest';

import { Event } from '@dod/core';

import {
  tableReducer,
  initialTableState,
  type TableState,
} from '../src/client/store.js';
import type { LobbyState, PlayerView } from '../src/shared/index.js';

function makeView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    self: {} as PlayerView['self'],
    mode: 1 as PlayerView['mode'],
    map: [],
    treasuresFound: 0,
    ended: null,
    party: [],
    monster: null,
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
    const lobby = {
      members: [{ id: 'a', name: 'Alice', ready: true, connected: true }],
      character: null,
    } satisfies LobbyState;

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

  it("appends a turn's events as one attributed group", () => {
    const next = tableReducer(initialTableState, {
      type: 'events',
      from: 'alice',
      events: [Event.info('a door creaks'), Event.loot('you find gold')],
    });

    // One message → one event group bundling both raw events under one `from`.
    expect(next.feed).toEqual([
      {
        kind: 'event',
        from: 'alice',
        events: [
          { kind: 'INFO', text: 'a door creaks' },
          { kind: 'LOOT', text: 'you find gold' },
        ],
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

    // Each message is its own group, in arrival order.
    expect(second.feed).toHaveLength(2);
    expect(
      second.feed.map((group) => (group.kind === 'event' ? group.from : null))
    ).toEqual(['alice', 'bob']);
    expect(first.feed).toHaveLength(1); // prior state untouched (immutable fold)
  });

  it('caps the scrollback at 256 turns, dropping the oldest', () => {
    // One turn per message, so 300 messages → 300 groups before the cap.
    let state: TableState = initialTableState;
    for (let i = 0; i < 300; i++) {
      state = tableReducer(state, {
        type: 'events',
        from: 'alice',
        events: [Event.info(`m${i}`)],
      });
    }

    expect(state.feed).toHaveLength(256);
    const first = state.feed[0];
    const last = state.feed[255];
    // oldest 44 dropped (300 - 256), newest retained
    expect(first.kind === 'event' && first.events[0].text).toBe('m44');
    expect(last.kind === 'event' && last.events[0].text).toBe('m299');
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

  it('posts a Connected notice on each open transition, not on every status', () => {
    // connecting → open: one notice.
    const open = tableReducer(initialTableState, {
      type: 'status',
      status: 'open',
    });
    expect(open.feed).toEqual([{ kind: 'notice', text: 'Connected.' }]);

    // open → closed → connecting: no new notices while away.
    const dropped = tableReducer(open, { type: 'status', status: 'closed' });
    const retrying = tableReducer(dropped, {
      type: 'status',
      status: 'connecting',
    });
    expect(retrying.feed).toHaveLength(1);

    // back to open: a second notice.
    const back = tableReducer(retrying, { type: 'status', status: 'open' });
    expect(back.feed).toEqual([
      { kind: 'notice', text: 'Connected.' },
      { kind: 'notice', text: 'Connected.' },
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
