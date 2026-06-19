import { serialize } from 'node:v8';
import { Game, createPlayer } from '@dod/core';

const now = () => performance.now();
const us = (ms: number) => `${(ms * 1000).toFixed(1)}µs`;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const mk = (i: number) =>
  createPlayer({
    race: ((i % 4) + 1) as 1,
    baseStats: { ST: 9, DX: 9, IQ: 12, HP: 20 },
    allocations: { ST: 2, DX: 1, IQ: 2 },
    gold: 1000,
    weaponTier: 1,
    armorTier: 1,
    flares: 10,
  });

function build(party: number) {
  const roster = Array.from({ length: party }, (_, i) => ({
    id: `p${i}`,
    player: mk(i),
  }));
  const game = new Game({ players: roster });
  if (party > 1) game.scatterParty();
  const M = ['N', 'S', 'E', 'W', 'U', 'D', 'F'];
  for (let s = 0; s < 300; s++)
    for (const { id } of roster)
      if (!game.endMode) game.step(id, M[(Math.random() * M.length) | 0]!);
  return game;
}

console.log('\nWrite-path cost per action\n');
for (const party of [1, 2, 4]) {
  const game = build(party);
  const depth = game.dungeon.rooms.length;

  const tSave: number[] = [];
  const tSer: number[] = [];
  for (let i = 0; i < 10_000; i++) {
    let t = now();
    const save = game.toSave();
    tSave.push(now() - t);
    t = now();
    serialize(save);
    tSer.push(now() - t);
  }
  console.log(`PARTY ${party}  |  ${depth} floors  |  ${depth * 49} rooms`);
  console.log(`  toSave()                    ${us(mean(tSave))}`);
  console.log(`  serialize(save)             ${us(mean(tSer))}`);
  console.log(`  full persist (save+ser)     ${us(mean(tSave) + mean(tSer))}`);
}
