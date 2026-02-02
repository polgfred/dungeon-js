import { EncounterSession } from '../../src/dungeon/encounter.js';
import { createSpellCounts, Player } from '../../src/dungeon/model.js';
import { Race, Spell } from '../../src/dungeon/constants.js';
import type { Event, PromptData } from '../../src/dungeon/types.js';
import type { RandomSource } from '../../src/dungeon/rng.js';

type RunOptions = {
  seed: number;
  commands: string[];
  debug: boolean;
};

class SeededRng implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  random(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 2 ** 32;
  }

  randint(min: number, max: number): number {
    if (max < min) {
      throw new Error('randint max must be >= min');
    }
    return min + Math.floor(this.random() * (max - min + 1));
  }

  randrange(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      throw new Error('randrange max must be > 0');
    }
    return Math.floor(this.random() * maxExclusive);
  }

  choice<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('choice requires a non-empty array');
    }
    return items[this.randrange(items.length)];
  }
}

function parseArgs(argv: string[]): RunOptions {
  const options: RunOptions = {
    seed: 1,
    commands: ['F', 'F', 'S', 'F', 'F', 'R'],
    debug: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seed') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing value for --seed');
      }
      options.seed = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--commands') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing value for --commands');
      }
      options.commands = next.split(',').map((value) => value.trim());
      i += 1;
      continue;
    }
    if (arg === '--no-debug') {
      options.debug = false;
      continue;
    }
  }

  return options;
}

function formatPrompt(data?: PromptData): string[] {
  if (!data?.options) {
    return [];
  }
  return data.options.map(
    (option) =>
      `  - ${option.key}: ${option.label}${option.disabled ? ' (disabled)' : ''}`
  );
}

function printEvents(events: Event[]): void {
  for (const event of events) {
    if (event.kind === 'PROMPT') {
      console.log(`[${event.kind}] ${event.text}`);
      for (const line of formatPrompt(event.data)) {
        console.log(line);
      }
      if (event.data?.hasCancel) {
        console.log('  - Esc: Cancel');
      }
      continue;
    }
    if (event.kind === 'STATUS' || event.kind === 'MAP') {
      console.log(`[${event.kind}] ${JSON.stringify(event.data)}`);
      continue;
    }
    if (event.kind === 'DEBUG') {
      console.log(`[${event.kind}] ${JSON.stringify(event.data)}`);
      continue;
    }
    console.log(`[${event.kind}] ${event.text}`);
  }
}

function buildTestPlayer(): Player {
  const spells = createSpellCounts();
  spells[Spell.FIREBALL] = 2;
  spells[Spell.LIGHTNING] = 1;
  spells[Spell.PROTECTION] = 1;

  return new Player({
    z: 0,
    y: 0,
    x: 0,
    race: Race.HUMAN,
    str: 12,
    dex: 12,
    iq: 14,
    hp: 20,
    mhp: 20,
    gold: 0,
    flares: 0,
    weaponTier: 2,
    armorTier: 1,
    weaponName: 'Short sword',
    armorName: 'Leather',
    spells,
  });
}

function runEncounter(options: RunOptions): void {
  const rng = new SeededRng(options.seed);
  const player = buildTestPlayer();
  const monsterLevel = 3;
  const session = EncounterSession.start({
    rng,
    player,
    monsterLevel,
    debug: options.debug,
  });

  console.log('=== Encounter start ===');
  printEvents(session.startEvents());

  for (const command of options.commands) {
    console.log(`\n> ${command}`);
    const result = session.step(command);
    printEvents(result.events);
    if (result.done) {
      console.log('\n=== Encounter done ===');
      break;
    }
  }

  console.log('\n=== Final player ===');
  console.log(
    JSON.stringify(
      {
        hp: player.hp,
        gold: player.gold,
        weaponTier: player.weaponTier,
        weaponBroken: player.weaponBroken,
        armorTier: player.armorTier,
        fatigued: player.fatigued,
        tempArmorBonus: player.tempArmorBonus,
        spells: player.spells,
      },
      null,
      2
    )
  );
}

runEncounter(parseArgs(process.argv.slice(2)));
