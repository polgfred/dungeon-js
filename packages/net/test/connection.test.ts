import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TableConnection,
  type ConnectionStatus,
} from '../src/client/connection.js';

/** A minimal stand-in for the browser WebSocket: records instances and lets the
 *  test drive the open/close/message events by hand. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  private listeners: Record<string, ((event: unknown) => void)[]> = {};
  sent: string[] = [];
  readyState = FakeWebSocket.CONNECTING;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(
    type: string,
    cb: (event: unknown) => void,
    options?: { signal?: AbortSignal }
  ) {
    if (options?.signal?.aborted) return;
    const list = (this.listeners[type] ??= []);
    list.push(cb);
    // Mirror the browser: aborting the signal removes the listener.
    options?.signal?.addEventListener('abort', () => {
      const i = list.indexOf(cb);
      if (i >= 0) list.splice(i, 1);
    });
  }

  send(data: string) {
    this.sent.push(data);
  }

  // Mirrors the browser: close() drives a 'close' event.
  close() {
    this.emit('close');
  }

  emit(type: string, event: unknown = {}) {
    if (type === 'open') this.readyState = FakeWebSocket.OPEN;
    if (type === 'close') this.readyState = FakeWebSocket.CLOSED;
    (this.listeners[type] ?? []).forEach((cb) => cb(event));
  }
}

const latest = () => FakeWebSocket.instances.at(-1)!;

describe('TableConnection reconnect', () => {
  let statuses: ConnectionStatus[];

  function connect() {
    return new TableConnection('ws://table/ws/x', {
      onMessage: () => {},
      onStatus: (s) => statuses.push(s),
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    FakeWebSocket.instances = [];
    statuses = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('opens one socket and reports connecting', () => {
    connect();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(statuses).toEqual(['connecting']);
  });

  it('reconnects after an unintentional drop, with exponential backoff', () => {
    connect();
    latest().emit('open');

    // First drop → retry after 0.5s.
    latest().emit('close');
    vi.advanceTimersByTime(499);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // Still no successful open → next retry doubles to 1s.
    latest().emit('close');
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);

    // ...and again to 2s.
    latest().emit('close');
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it('caps the backoff and keeps retrying forever', () => {
    connect();
    latest().emit('open');
    // Drop repeatedly without ever opening; the delay should cap at 15s.
    for (let i = 0; i < 10; i++) {
      latest().emit('close');
      vi.advanceTimersByTime(15_000);
    }
    // 1 initial + 10 reconnects, all eventually within the 15s cap.
    expect(FakeWebSocket.instances).toHaveLength(11);
  });

  it('resets the backoff after a successful open', () => {
    connect();
    latest().emit('open');

    latest().emit('close'); // attempt 1 → 0.5s
    vi.advanceTimersByTime(500);
    latest().emit('close'); // attempt 2 → 1s
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(3);

    latest().emit('open'); // healthy → backoff resets

    latest().emit('close'); // back to 0.5s, not 2s
    vi.advanceTimersByTime(499);
    expect(FakeWebSocket.instances).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it('drops a send while still connecting, then sends once open', () => {
    const conn = connect(); // socket is CONNECTING
    expect(() => conn.join('p', 'Pat')).not.toThrow();
    expect(latest().sent).toEqual([]); // swallowed, not thrown

    latest().emit('open');
    conn.join('p', 'Pat');
    expect(latest().sent).toHaveLength(1);
  });

  it('stops retrying once intentionally closed, and goes silent', () => {
    const conn = connect();
    latest().emit('open');

    conn.close();
    // Teardown is silent — it must not report 'closed' (i.e. "reconnecting").
    expect(statuses).toEqual(['connecting', 'open']);

    // No reconnection, no matter how long we wait.
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('ignores a late close from a superseded socket', () => {
    connect();
    const first = latest();
    first.emit('open');

    // Drop and reconnect to a second socket that is healthy.
    first.emit('close');
    vi.advanceTimersByTime(500);
    const second = latest();
    expect(second).not.toBe(first);
    second.emit('open');
    expect(statuses.at(-1)).toBe('open');

    // The old socket fires a stray late 'close' — it must not clobber status
    // nor kick off a reconnect against the healthy second socket.
    first.emit('close');
    expect(statuses.at(-1)).toBe('open');
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
