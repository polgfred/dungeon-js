/**
 * A dumb autopilot — connects a throwaway adventurer to a table and plays on its
 * own, so you can fill a party and exercise the multiplayer server without a roomful
 * of browser tabs. Launch one per seat; pass distinct names.
 *
 *   npm run dev:server                            # terminal 1: the worker
 *   npm run bot -w @dod/net -- <table> [name]     # terminal 2+: each bot
 *
 * It is not clever. Each "turn" (a random 2–5s apart) it:
 *   - resolves any open spell menu it opened last turn,
 *   - in an ENCOUNTER: flees (teleport, else run) when hurt, otherwise casts an
 *     offensive spell if it has one, else swings,
 *   - in EXPLORE: grabs a scroll/chest underfoot, drops a flare if most neighbours
 *     are unmapped, then wanders toward unexplored rooms (avoiding monster tiles and
 *     calling for help when hurt — it only ever stays put mid-fight, never out here).
 *
 * Bots auto-start the run a few seconds after every lobby member is ready (set
 * DOD_AUTOSTART=0 to wait for a human to press start instead). DOD_URL overrides
 * the worker address (default ws://localhost:8787).
 */
import {
  ACTOR_TOKEN,
  Feature,
  MapTile,
  Mode,
  Race,
  Spell,
  SPELL_MIN_IQ,
  defaultRandomSource,
  rollBaseStats,
  createPlayer,
  serializePlayer,
} from '@dod/core';
import type {
  ClientMessage,
  LobbyState,
  PlayerView,
  ServerMessage,
} from '@dod/net/shared';

const [, , table = 'demo', name = `Bot-${process.pid}`] = process.argv;
const url = process.env.DOD_URL ?? 'ws://localhost:8787';
const autostart = false;
// The name doubles as a stable id, so a relaunch reclaims the same seat.
const playerId = name;

const LOW_HP = 10;
const FLARE_UNSEEN_FRACTION = 0.5; // most neighbours unmapped → light a flare
const TURN_MIN_MS = 2000;
const TURN_MAX_MS = 5000;
const AUTOSTART_DELAY_MS = 3000;

// spells[] is in this fixed order (see serializePlayer); the encounter menu keys
// each spell by its initial.
const SPELL_ORDER = [
  Spell.PROTECTION,
  Spell.FIREBALL,
  Spell.LIGHTNING,
  Spell.WEAKEN,
  Spell.TELEPORT,
] as const;
const SPELL_KEY: Record<Spell, string> = {
  [Spell.PROTECTION]: 'P',
  [Spell.FIREBALL]: 'F',
  [Spell.LIGHTNING]: 'L',
  [Spell.WEAKEN]: 'W',
  [Spell.TELEPORT]: 'T',
};

function log(message: string): void {
  console.log(`[${name}] ${message}`);
}

function makeCharacter() {
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

// --- map helpers ------------------------------------------------------------

function inBounds(view: PlayerView, y: number, x: number): boolean {
  return y >= 0 && y < view.map.length && x >= 0 && x < view.map[0].length;
}

/** Fraction of the (up to 8) adjacent in-bounds rooms still unmapped. */
function neighborUnseenFraction(view: PlayerView): number {
  const { self } = view;
  let total = 0;
  let unseen = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dy === 0 && dx === 0) continue;
      const y = self.y + dy;
      const x = self.x + dx;
      if (!inBounds(view, y, x)) continue;
      total += 1;
      if (view.map[y][x] === MapTile.UNSEEN) unseen += 1;
    }
  }
  return total === 0 ? 0 : unseen / total;
}

const DIRECTIONS = [
  { key: 'N', dy: -1, dx: 0 },
  { key: 'S', dy: 1, dx: 0 },
  { key: 'E', dy: 0, dx: 1 },
  { key: 'W', dy: 0, dx: -1 },
] as const;

/** Pick a step, preferring unexplored rooms; dodge monster tiles when told to. */
function chooseMove(view: PlayerView, avoidMonsters: boolean): string | null {
  const { self } = view;
  const open = DIRECTIONS.filter(({ dy, dx }) => {
    const y = self.y + dy;
    const x = self.x + dx;
    if (!inBounds(view, y, x)) return false;
    return !(avoidMonsters && view.map[y][x] === MapTile.MONSTER);
  });
  if (open.length === 0) return null;
  const unexplored = open.filter(
    ({ dy, dx }) => view.map[self.y + dy][self.x + dx] === MapTile.UNSEEN
  );
  const pool = unexplored.length > 0 ? unexplored : open;
  return pool[Math.floor(Math.random() * pool.length)].key;
}

function spellCharges(view: PlayerView, spell: Spell): number {
  return view.self.spells[SPELL_ORDER.indexOf(spell)] ?? 0;
}

function canCast(view: PlayerView, spell: Spell): boolean {
  return view.self.iq >= SPELL_MIN_IQ && spellCharges(view, spell) > 0;
}

// --- connection -------------------------------------------------------------

const ws = new WebSocket(`${url}/ws/${table}`);

function send(message: ClientMessage): void {
  ws.send(JSON.stringify(message));
}

let latestView: PlayerView | null = null;
let ticking = false;
let helpRequested = false;
let autostartTimer: ReturnType<typeof setTimeout> | undefined;

function callForHelp(): void {
  if (helpRequested || !latestView) return;
  helpRequested = true;
  send({ type: 'chat', text: `Help! I'm down to ${latestView.self.hp} HP.` });
  log('called for help in chat');
}

function maybeAutostart(state: LobbyState): void {
  if (!autostart) return;
  const ready = state.members.length > 0 && state.members.every((m) => m.ready);
  clearTimeout(autostartTimer);
  if (ready)
    autostartTimer = setTimeout(
      () => send({ type: 'start' }),
      AUTOSTART_DELAY_MS
    );
}

/** Resolve a spell menu we opened: cast the best enabled spell, else back out. */
function resolveSpellPrompt(view: PlayerView, hurt: boolean): void {
  const enabled = view.prompt!.options.filter((o) => !o.disabled);
  const priority = hurt
    ? ['T', 'L', 'F', 'W', 'P'] // flee first when hurt
    : ['L', 'F', 'W', 'T', 'P']; // hit hardest otherwise
  const key = priority.find((k) => enabled.some((o) => o.key === k));
  if (key) {
    log(`casting via [${key}]`);
    send({ type: 'action', command: key });
  } else {
    send({ type: 'cancel' });
  }
}

function takeTurn(): void {
  const view = latestView;
  if (!view || view.ended) return;

  const { self } = view;
  const hurt = self.hp < LOW_HP;
  if (!hurt) helpRequested = false;

  // We opened a spell menu last turn — finish that interaction first.
  if (view.prompt) {
    resolveSpellPrompt(view, hurt);
    return;
  }

  if (view.mode === Mode.ENCOUNTER) {
    if (hurt) {
      callForHelp();
      if (canCast(view, Spell.TELEPORT)) {
        log('hurt — teleporting away');
        send({ type: 'action', command: 'S' });
      } else {
        log('hurt — running from the monster');
        send({ type: 'action', command: 'R' });
      }
      return;
    }
    const offensive = [Spell.LIGHTNING, Spell.FIREBALL, Spell.WEAKEN].find(
      (s) => canCast(view, s)
    );
    if (offensive !== undefined) {
      log(`opening spell menu (have ${SPELL_KEY[offensive]})`);
      send({ type: 'action', command: 'S' });
    } else {
      log('fighting');
      send({ type: 'action', command: 'F' });
    }
    return;
  }

  // EXPLORE — having escaped any fight, keep moving even when hurt; just call
  // for help and steer clear of monster tiles (chooseMove avoids them).
  if (hurt) callForHelp();

  const here = view.map[self.y][self.x];
  if (here === Feature.SCROLL) {
    log('reading a scroll here');
    send({ type: 'action', command: 'R' });
    return;
  }
  if (here === Feature.CHEST) {
    log('opening a chest here');
    send({ type: 'action', command: 'O' });
    return;
  }
  if (self.flares > 0 && neighborUnseenFraction(view) > FLARE_UNSEEN_FRACTION) {
    log('most rooms nearby are dark — lighting a flare');
    send({ type: 'action', command: 'F' });
    return;
  }

  const move = chooseMove(view, hurt);
  if (move) {
    log(`moving ${move}`);
    send({ type: 'action', command: move });
  } else {
    log('boxed in — waiting');
  }
}

function scheduleTurn(): void {
  if (latestView?.ended) {
    ticking = false;
    return;
  }
  const delay = TURN_MIN_MS + Math.random() * (TURN_MAX_MS - TURN_MIN_MS);
  setTimeout(() => {
    takeTurn();
    scheduleTurn();
  }, delay);
}

function startTicking(): void {
  if (ticking) return;
  ticking = true;
  scheduleTurn();
}

// id → display name, so event lines can name who acted.
const names = new Map<string, string>();

ws.addEventListener('open', () => {
  log(`connected to "${table}" at ${url}`);
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
      maybeAutostart(message.state);
      break;
    case 'view':
      for (const member of message.view.party)
        names.set(member.id, member.name);
      latestView = message.view;
      if (message.view.ended) {
        const won = message.view.ended === Mode.VICTORY;
        log(won ? 'the party won! 🎉' : 'game over.');
      } else {
        startTicking();
      }
      break;
    case 'events': {
      const who = names.get(message.from) ?? message.from;
      for (const e of message.events)
        log(`· ${e.text.replaceAll(ACTOR_TOKEN, who)}`);
      break;
    }
    case 'chat': {
      const who = message.from === playerId ? 'me' : message.name;
      log(`<${who}> ${message.text}`);
      break;
    }
    case 'error':
      log(`⚠ ${message.message}`);
      break;
  }
});

ws.addEventListener('error', () => {
  log('connection error — is the worker running? (npm run dev:server)');
});

ws.addEventListener('close', () => {
  log('disconnected.');
  process.exit(0);
});
