/**
 * Raw-dog terminal client — play a multiplayer Dungeon of Doom game over a
 * WebSocket, no browser required. Point it at a running worker and you join a
 * room, build a throwaway character, and drive your adventurer from the keyboard.
 *
 *   npm run dev  -w @dod/net                     # terminal 1: the worker
 *   npm run play -w @dod/net -- <room> [name]    # terminal 2+: each player
 *
 * At the `> ` prompt:
 *   /start            begin the run (once everyone's character is in)
 *   /cancel           back out of a prompt (the Esc equivalent)
 *   /quit             disconnect
 *   anything else     sent as a game command (n/s/e/w, f, l, o, r, p, b, u/d/x,
 *                     and the encounter/prompt keys f/r/s, y/n, ...)
 */
import { clearLine, createInterface, cursorTo } from 'node:readline';

import {
  FEATURE_SYMBOLS,
  Player,
  Race,
  serializePlayer,
  defaultRandomSource,
  type Event,
} from '@dod/core';
import type {
  ClientMessage,
  LobbyState,
  PlayerView,
  ServerMessage,
} from '@dod/net/shared';

const [, , room = 'demo', name = 'Hero'] = process.argv;
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
  const [st, dx, iq, hp] = Player.rollBaseStats(defaultRandomSource, Race.HUMAN);
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
          .map((cell, x) => {
            if (x === self.x && y === self.y) return '@';
            if (!cell.seen) return '·';
            if (cell.monsterLevel > 0) return 'M';
            if (cell.treasureId > 0) return 'T';
            return FEATURE_SYMBOLS[cell.feature] ?? '-';
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

function formatEvent(event: Event, mine: boolean): string {
  if (event.kind === 'PROMPT') {
    const lines = [`  ${event.text}`];
    for (const option of event.data?.options ?? []) {
      const dim = option.disabled ? ' (unavailable)' : '';
      lines.push(`    [${option.key}] ${option.label}${dim}`);
    }
    if (event.data?.hasCancel) lines.push('    [/cancel] back out');
    return lines.join('\n');
  }
  const tag = event.broadcast && !mine ? '«party» ' : '';
  return `  ${tag}${event.text}`;
}

function eventsText(from: string, events: Event[]): string {
  const mine = from === playerId;
  return events
    .filter((event) => event.kind !== 'DEBUG')
    .map((event) => formatEvent(event, mine))
    .join('\n');
}

const ws = new WebSocket(`${url}/${room}`);

function send(message: ClientMessage): void {
  ws.send(JSON.stringify(message));
}

ws.addEventListener('open', () => {
  show(`connected to "${room}" as ${name}`);
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
      show(lobbyText(message.state));
      break;
    case 'view':
      show(viewText(message.view));
      break;
    case 'events': {
      const text = eventsText(message.from, message.events);
      if (text) show(text);
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
  } else if (text) {
    send({ type: 'action', command: text });
  }
  rl.prompt();
});

rl.prompt();
