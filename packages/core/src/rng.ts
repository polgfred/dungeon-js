export interface RandomSource {
  random(): number;
  randint(min: number, max: number): number;
  randrange(maxExclusive: number): number;
  choice<T>(items: T[]): T;
}

function randint(min: number, max: number): number {
  if (max < min) {
    throw new Error('randint max must be >= min');
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randrange(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error('randrange max must be > 0');
  }
  return Math.floor(Math.random() * maxExclusive);
}

function choice<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('choice requires a non-empty array');
  }
  return items[randrange(items.length)];
}

function random(): number {
  return Math.random();
}

export const defaultRandomSource: RandomSource = {
  random,
  randint,
  randrange,
  choice,
};
