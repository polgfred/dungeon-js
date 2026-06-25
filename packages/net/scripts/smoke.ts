/* eslint-disable no-console */

/**
 * Network smoke test — proves the server layer end to end without a browser:
 * two players join a table, ready up, start, take a turn, and reconnect, while we
 * assert on the protocol traffic. Assertions are structural (independent of the
 * random dungeon), so this is a fast "is the network layer broken?" check.
 *
 *   npm run smoke -w @dod/net
 *
 * By default it spins up its own `wrangler dev` and tears it down. Set DOD_URL to
 * run against a worker you already have up:
 *
 *   DOD_URL=ws://localhost:8787 npm run smoke -w @dod/net
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  Race,
  defaultRandomSource,
  rollBaseStats,
  createPlayer,
  serializePlayer,
} from '@dod/core';
import type { ClientMessage, PlayerView, ServerMessage } from '@dod/net/shared';

const PORT = Number(process.env.DOD_PORT ?? 8799);
const EXTERNAL_URL = process.env.DOD_URL;
const baseUrl = EXTERNAL_URL ?? `ws://localhost:${PORT}`;
const table = `smoke-${Date.now()}`;

let checks = 0;
function check(condition: boolean, label: string): void {
  if (!condition) throw new Error(`FAILED: ${label}`);
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function character() {
  const [st, dx, iq, hp] = rollBaseStats(defaultRandomSource, Race.HUMAN);
  return serializePlayer(
    createPlayer({
      race: Race.HUMAN,
      baseStats: { ST: st, DX: dx, IQ: iq, HP: hp },
      allocations: { ST: 2, DX: 2, IQ: 1 },
      gold: 100,
      flares: 5,
      weaponTier: 1,
      armorTier: 1,
    })
  );
}

/** A test client that queues server messages and lets you await specific ones. */
class Client {
  private ws: WebSocket;
  private queue: ServerMessage[] = [];
  private waiters: {
    match: (m: ServerMessage) => boolean;
    resolve: (m: ServerMessage) => void;
  }[] = [];

  constructor(
    readonly name: string,
    url: string
  ) {
    this.ws = new WebSocket(url);
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      const i = this.waiters.findIndex((w) => w.match(message));
      if (i >= 0) this.waiters.splice(i, 1)[0].resolve(message);
      else this.queue.push(message);
    });
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', () =>
        reject(new Error(`${this.name}: connection failed`))
      );
    });
  }

  send(message: ClientMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  async waitFor<T extends ServerMessage['type']>(
    type: T,
    predicate?: (m: Extract<ServerMessage, { type: T }>) => boolean,
    timeoutMs = 8000
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const match = (
      m: ServerMessage
    ): m is Extract<ServerMessage, { type: T }> =>
      m.type === type &&
      (!predicate || predicate(m as Extract<ServerMessage, { type: T }>));
    const queued = this.queue.findIndex(match);
    if (queued >= 0) {
      return this.queue.splice(queued, 1)[0] as Extract<
        ServerMessage,
        { type: T }
      >;
    }
    return (await Promise.race([
      new Promise<ServerMessage>((resolve) =>
        this.waiters.push({ match, resolve })
      ),
      sleep(timeoutMs).then(() => {
        throw new Error(`${this.name}: timed out waiting for "${type}"`);
      }),
    ])) as Extract<ServerMessage, { type: T }>;
  }

  close(): void {
    this.ws.close();
  }
}

async function scenario(): Promise<void> {
  const url = `${baseUrl}/ws/${table}`;

  // --- lobby ---
  const alice = new Client('alice', url);
  await alice.open();
  alice.send({ type: 'join', playerId: 'alice', name: 'Alice' });
  alice.send({ type: 'setCharacter', character: character() });
  await alice.waitFor('lobby', (m) =>
    m.state.members.some((x) => x.id === 'alice' && x.ready)
  );
  check(true, 'lobby reflects a joined, ready player');

  const bob = new Client('bob', url);
  await bob.open();
  bob.send({ type: 'join', playerId: 'bob', name: 'Bob' });
  bob.send({ type: 'setCharacter', character: character() });
  const lobby = await alice.waitFor(
    'lobby',
    (m) => m.state.members.length === 2 && m.state.members.every((x) => x.ready)
  );
  check(
    lobby.state.members.length === 2,
    'both players appear in the lobby, ready'
  );

  // --- start ---
  alice.send({ type: 'start' });
  const aliceStart = await alice.waitFor('view');
  const bobStart = await bob.waitFor('view');
  const validView = (v: PlayerView) =>
    v.map.length === 7 &&
    v.map.every((row) => row.length === 7) &&
    v.party.length === 2 &&
    [1, 2, 3, 4].includes(v.mode);
  check(validView(aliceStart.view), 'start delivers Alice a well-formed view');
  check(validView(bobStart.view), 'start delivers Bob a well-formed view');

  // --- a turn (fan-out: everyone gets a fresh view) ---
  alice.send({ type: 'action', command: 'n' });
  const aliceTurn = await alice.waitFor('view');
  const bobTurn = await bob.waitFor('view');
  check(!!aliceTurn, 'the acting player receives an updated view');
  check(!!bobTurn, "a teammate's view refreshes on someone else's turn");

  // --- disconnect is visible to teammates ---
  alice.close();
  await bob.waitFor(
    'view',
    (m) => m.view.party.some((p) => p.id === 'alice' && !p.connected),
    4000
  );
  check(true, 'a teammate sees a dropped player as offline');

  // --- reconnect (same id resumes the seat) ---
  const aliceAgain = new Client('alice', url);
  await aliceAgain.open();
  aliceAgain.send({ type: 'join', playerId: 'alice', name: 'Alice' });
  const resumed = await aliceAgain.waitFor('view');
  check(
    resumed.view.party.some((p) => p.id === 'alice'),
    'reconnecting with the same id resumes the player'
  );

  await bob.waitFor(
    'view',
    (m) => m.view.party.some((p) => p.id === 'alice' && p.connected),
    4000
  );
  check(true, 'teammates see a reconnected player come back online');

  aliceAgain.close();
  bob.close();
}

async function waitForWorker(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${PORT}/`);
      return;
    } catch {
      await sleep(300);
    }
  }
  throw new Error(`worker did not become ready on port ${PORT}`);
}

async function main(): Promise<void> {
  console.log(`network smoke — table "${table}" @ ${baseUrl}\n`);

  if (EXTERNAL_URL) {
    await scenario();
  } else {
    // wrangler.jsonc lives at the repo root (one unified Worker config).
    const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
    const worker = spawn('wrangler', ['dev', '--port', String(PORT)], {
      cwd: repoRoot,
      detached: true,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      await waitForWorker(5_000);
      await scenario();
    } finally {
      if (worker.pid) {
        try {
          process.kill(-worker.pid, 'SIGTERM');
        } catch {
          // already gone
        }
      }
    }
  }

  console.log(`\nnetwork smoke: PASS (${checks} checks)`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(
      `\nnetwork smoke: ${error instanceof Error ? error.message : error}`
    );
    process.exit(1);
  }
);
