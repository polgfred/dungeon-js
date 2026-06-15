/**
 * Raw-dog terminal client — play a multiplayer Dungeon of Doom game over a
 * WebSocket, no browser required. Point it at a running worker and you join a
 * table, build a throwaway character, and drive your adventurer from the keyboard.
 *
 *   npm run dev:server                            # terminal 1: the worker
 *   npm run play -w @dod/net -- <table> [name]    # terminal 2+: each player
 *
 * At the `> ` prompt:
 *   /start            begin the run (once everyone's character is in)
 *   /cancel           back out of a prompt (the Esc equivalent)
 *   /chat <message>   say something to everyone at the table
 *   /quit             disconnect
 *   anything else     sent as a game command (n/s/e/w, f, l, o, r, p, b, u/d/x,
 *                     and the encounter/prompt keys f/r/s, y/n, ...)
 */
import { clearLine, createInterface, cursorTo } from 'node:readline';

import {
  ACTOR_TOKEN,
  Player,
  Race,
  serializePlayer,
  tileSymbol,
  defaultRandomSource,
  type Event,
} from '@dod/core';
import type {
  ClientMessage,
  LobbyState,
  PlayerView,
  ServerMessage,
} from '@dod/net/shared';

const [, , table = 'demo', name = 'Hero'] = process.argv;
const url = process.env.DOD_URL ?? 'ws://localhost:8787';
// Use the name as a stable id, so relaunching reconnects you to the same seat
// instead of arriving as a new (locked-out) player. Pass distinct names per
// terminal for multiplayer.
const playerId = name;

const MODE_NAMES: Record<number, string> = {
  1: 'EXPLORE',
  2: 'ENCOUNTER',
  3: 'GAME OVER',
  4: 'VICTORY',
};

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

/** Print a block above the prompt without trampling whatever's being typed. */
function show(block: string): void {
  const pending = rl.line;
  cursorTo(process.stdout, 0);
  clearLine(process.stdout, 0);
  process.stdout.write(block.endsWith('\n') ? block : `${block}\n`);
  rl.prompt(true);
  if (pending) process.stdout.write(pending);
}

function makeCharacter() {
  const [st, dx, iq, hp] = Player.rollBaseStats(
    defaultRandomSource,
    Race.HUMAN
  );
  const player = Player.create({
    race: Race.HUMAN,
    baseStats: { ST: st, DX: dx, IQ: iq, HP: hp },
    gold: 100,
    allocations: { ST: 2, DX: 2, IQ: 1 },
    weaponTier: 1,
    armorTier: 1,
    flareCount: 5,
  });
  return serializePlayer(player);
}

function lobbyText(state: LobbyState): string {
  const lines = ['— LOBBY —'];
  for (const member of state.members) {
    const you = member.id === playerId ? ' (you)' : '';
    lines.push(`  ${member.ready ? '✓' : '·'} ${member.name}${you}`);
  }
  lines.push('  /start to begin');
  return lines.join('\n');
}

function viewText(view: PlayerView): string {
  const { self } = view;
  const lines: string[] = [''];
  for (let y = 0; y < view.map.length; y += 1) {
    lines.push(
      '  ' +
        view.map[y]
          .map((tile, x) => {
            if (x === self.x && y === self.y) return '@';
            return tileSymbol(tile);
          })
          .join(' ')
    );
  }
  const party = view.party
    .map((p) => `${p.name}${p.alive ? '' : '†'}`)
    .join(', ');
  lines.push(
    `  HP ${self.hp}/${self.mhp}  gold ${self.gold}  ST ${self.str} DX ${self.dex} IQ ${self.iq}  ` +
      `flares ${self.flares}  treasures ${view.treasuresFound}/10`
  );
  lines.push(
    `  ${MODE_NAMES[view.mode] ?? view.mode}  weapon ${self.weaponName}  armour ${self.armorName}  party: ${party}`
  );
  return lines.join('\n');
}

// id → display name, kept current from lobby/view, so events can name <who>
// acted. (Browser players have opaque ids; the CLI uses its name as its id.)
const names = new Map<string, string>();

function formatEvent(event: Event, mine: boolean, fromName: string): string {
  if (event.kind === 'PROMPT') {
    const lines = [`  ${event.text}`];
    for (const option of event.data?.options ?? []) {
      const dim = option.disabled ? ' (unavailable)' : '';
      lines.push(`    [${option.key}] ${option.label}${dim}`);
    }
    if (event.data?.hasCancel) lines.push('    [/cancel] back out');
    return lines.join('\n');
  }
  // A game event embeds the actor's name as ACTOR_TOKEN.
  return `  * ${event.text.replaceAll(ACTOR_TOKEN, fromName)}`;
}

function eventsText(from: string, events: Event[]): string {
  const mine = from === playerId;
  const fromName = names.get(from) ?? from;
  return events
    .filter((event) => event.kind !== 'DEBUG')
    .map((event) => formatEvent(event, mine, fromName))
    .join('\n');
}

const ws = new WebSocket(`${url}/ws/${table}`);

function send(message: ClientMessage): void {
  ws.send(JSON.stringify(message));
}

ws.addEventListener('open', () => {
  show(`connected to "${table}" as ${name}`);
  send({ type: 'join', playerId, name });
  send({ type: 'setCharacter', character: makeCharacter() });
});

ws.addEventListener('message', (event) => {
  let message: ServerMessage;
  try {
    message = JSON.parse(String(event.data)) as ServerMessage;
  } catch {
    return;
  }
  switch (message.type) {
    case 'lobby':
      for (const member of message.state.members)
        names.set(member.id, member.name);
      show(lobbyText(message.state));
      break;
    case 'view':
      for (const member of message.view.party)
        names.set(member.id, member.name);
      show(viewText(message.view));
      break;
    case 'events': {
      const text = eventsText(message.from, message.events);
      if (text) show(text);
      break;
    }
    case 'chat': {
      const who = message.from === playerId ? '' : `<${message.name}> `;
      show(`  - ${who}${message.text}`);
      break;
    }
    case 'error':
      show(`⚠ ${message.message}`);
      break;
  }
});

ws.addEventListener('error', () => {
  show('connection error — is the worker running? (npm run dev -w @dod/net)');
});

ws.addEventListener('close', () => {
  show('disconnected.');
  process.exit(0);
});

rl.on('line', (line) => {
  const text = line.trim();
  if (text === '/quit') {
    ws.close();
    return;
  }
  if (text === '/start') {
    send({ type: 'start' });
  } else if (text === '/cancel') {
    send({ type: 'cancel' });
  } else if (text.startsWith('/chat')) {
    const msg = text.slice('/chat'.length).trim();
    if (msg) send({ type: 'chat', text: msg });
  } else if (text) {
    send({ type: 'action', command: text });
  }
  rl.prompt();
});

rl.prompt();
