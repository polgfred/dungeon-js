import { deserialize, serialize } from 'node:v8';

import { expect, test } from 'vitest';

import { Game, createPlayer, type Race } from '@dod/core';

/**
 * A Durable Object rehydrates its Game from a v8-serialized snapshot every time
 * it wakes from hibernation. `v8.deserialize` silently degrades ARRAY element
 * kinds (PACKED_SMI → HOLEY_ELEMENTS) while preserving plain objects, so
 * `Game.fromSave` must REBUILD every array it adopts from the blob — or the
 * woken game wakes in a worse V8 representation and serializes ~2x slower for
 * the rest of the session. This asserts the woken game is representationally
 * identical to a live one, catching e.g. a new array field on GameSave that
 * fromSave adopts by reference without rebuilding.
 *
 * The `%`-prefixed V8 intrinsics can't survive esbuild's parser, so they're
 * wrapped in eval() (opaque strings at transform time) and evaluated at runtime,
 * where the worker carries `--allow-natives-syntax` (vitest.config.ts execArgv).
 */
const v8 = eval(`({
  fastProps: (o) => %HasFastProperties(o),
  smi:    (a) => %HasSmiElements(a),
  double: (a) => %HasDoubleElements(a),
  object: (a) => %HasObjectElements(a),
  holey:  (a) => %HasHoleyElements(a),
  dict:   (a) => %HasDictionaryElements(a),
})`) as Record<
  'fastProps' | 'smi' | 'double' | 'object' | 'holey' | 'dict',
  (x: unknown) => boolean
>;

const props = (o: object) => (v8.fastProps(o) ? 'fast' : 'DICT');
const KINDS = ['smi', 'double', 'object', 'holey', 'dict'] as const;
const elemKind = (a: unknown) =>
  KINDS.filter((k) => {
    try {
      return v8[k](a);
    } catch {
      return false;
    }
  }).join('+') || '?';

const mk = (i: number) =>
  createPlayer({
    race: ((i % 4) + 1) as Race,
    baseStats: { ST: 9, DX: 9, IQ: 12, HP: 20 },
    allocations: { ST: 2, DX: 1, IQ: 2 },
    gold: 1000,
    weaponTier: 1,
    armorTier: 1,
    flares: 10,
  });

test('hydrated Game matches the live V8 representation', () => {
  const roster = [0, 1, 2, 3].map((i) => ({ id: `p${i}`, player: mk(i) }));
  const live = new Game({ players: roster });
  live.scatterParty();
  const moves = ['N', 'S', 'E', 'W', 'U', 'D', 'F'];
  for (let s = 0; s < 300; s++) {
    for (const { id } of roster) {
      if (!live.endMode)
        live.step(id, moves[(Math.random() * moves.length) | 0]);
    }
  }

  // The exact DO wake path: toSave → v8 round-trip → fromSave.
  const hyd = Game.fromSave(deserialize(serialize(live.toSave())));

  const id = live.playerIds[0];
  const lp = live.getPlayer(id);
  const hp = hyd.getPlayer(id);
  const ld = live.dungeon.rooms;
  const hd = hyd.dungeon.rooms;

  const checks: [string, string, string][] = [
    ['Game properties', props(live), props(hyd)],
    ['Game.players elements', props(live.players), props(hyd.players)],
    ['Player properties', props(lp), props(hp)],
    ['Player.spells elements', elemKind(lp.spells), elemKind(hp.spells)],
    ['Room properties', props(ld[0][0][0]), props(hd[0][0][0])],
    ['dungeon z elements', elemKind(ld), elemKind(hd)],
    ['dungeon y elements', elemKind(ld[0]), elemKind(hd[0])],
    ['dungeon x elements', elemKind(ld[0][0]), elemKind(hd[0][0])],
  ];

  // Each hot structure must wake up in the same representation as live.
  const broken = checks
    .filter(([, liveKind, hydKind]) => liveKind !== hydKind)
    .map(([label, l, h]) => `${label}: live=${l} hydrated=${h}`);
  expect(broken).toEqual([]);
});
