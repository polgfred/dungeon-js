import type { RandomSource } from '../../src/dungeon/rng.js';

type RngQueues = {
  random?: number[];
  randint?: number[];
};

export class ScriptedRng implements RandomSource {
  private randomQueue: number[];
  private randintQueue: number[];

  constructor(queues: RngQueues = {}) {
    this.randomQueue = [...(queues.random ?? [])];
    this.randintQueue = [...(queues.randint ?? [])];
  }

  random(): number {
    if (this.randomQueue.length === 0) {
      throw new Error('ScriptedRng.random() queue is empty');
    }
    return this.randomQueue.shift() as number;
  }

  randint(min: number, max: number): number {
    if (this.randintQueue.length === 0) {
      throw new Error('ScriptedRng.randint() queue is empty');
    }
    const value = this.randintQueue.shift() as number;
    if (value < min || value > max) {
      throw new Error(
        `ScriptedRng.randint() expected ${min}..${max}, got ${value}`
      );
    }
    return value;
  }

  randrange(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      throw new Error('randrange max must be > 0');
    }
    return this.randint(0, maxExclusive - 1);
  }

  choice<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('choice requires a non-empty array');
    }
    const index = this.randrange(items.length);
    return items[index];
  }
}
