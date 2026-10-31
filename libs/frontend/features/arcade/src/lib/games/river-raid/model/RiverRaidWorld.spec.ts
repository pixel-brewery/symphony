// #region Imports

import { describe, expect, it } from 'vitest';
import { RiverRaidWorld } from './RiverRaidWorld';

// #endregion

describe('RiverRaidWorld', () => {
  it('starts from the original A814 shift register and generates the same river after a restart', () => {
    // arrange
    const first = new RiverRaidWorld();
    const second = new RiverRaidWorld();

    // act
    const blocks = Array.from({ length: 96 }, (_, index) => first.block(index));

    // assert
    expect(blocks.slice(0, 5).map((block) => block.seed)).toEqual([
      0x5029, 0xa053, 0x40a7, 0x814e, 0x029d,
    ]);
    expect(blocks).toEqual(Array.from({ length: 96 }, (_, index) => second.block(index)));
    expect(blocks.filter((block) => block.road).map((block) => block.id)).toEqual([31, 63, 95]);
    expect(blocks.slice(0, 30).every((block) => block.pattern === 7)).toBe(true);
    expect(blocks.slice(32, 62).some((block) => block.island)).toBe(true);
    expect(blocks.slice(64, 94).every((block) => block.pattern === 7)).toBe(true);
  });

  it('reflects original playfield pixels and closes every island before the bridge', () => {
    // arrange
    const world = new RiverRaidWorld();

    // act
    const blocks = Array.from({ length: 256 }, (_, index) => world.block(index));

    // assert
    for (const block of blocks) {
      if (block.road) {
        expect(block.island).toBe(false);
        expect(block.pattern).toBe(12);
      }
      for (const x of [0, 16, 32, 48, 64, 76])
        for (const y of [0, 15, 31])
          expect(world.isLand(x, block.id * 32 + y)).toBe(world.isLand(159 - x, block.id * 32 + y));
    }
    expect(world.isLand(20, 64)).toBe(true);
    expect(world.isLand(76, 64)).toBe(false);
    expect(world.isLand(159, 64)).toBe(true);
  });

  it('adds jets only after the first two sections and preserves the alternating level cap', () => {
    // arrange
    const world = new RiverRaidWorld();

    // act
    const blocks = Array.from({ length: 51 * 32 }, (_, index) => world.block(index));

    // assert
    expect(blocks.slice(0, 64).some((block) => block.object.kind === 'jet')).toBe(false);
    expect(blocks.slice(64).some((block) => block.object.kind === 'jet')).toBe(true);
    expect([
      world.block(46 * 32).level,
      world.block(47 * 32).level,
      world.block(48 * 32).level,
      world.block(49 * 32).level,
    ]).toEqual([47, 48, 47, 48]);
  });
  it('matches 4096 blocks evaluated from the original generator instructions', () => {
    // arrange
    const world = new RiverRaidWorld();
    const ids = { jet: 4, helicopter: 5, ship: 7, bridge: 8, house: 9, fuel: 10 };
    let fingerprint = 2166136261;

    // act
    for (let index = 0; index < 4096; index++) {
      const block = world.block(index);
      for (const value of [
        block.seed,
        block.pattern,
        Number(block.island),
        ids[block.object.kind],
        block.object.x,
        block.object.direction,
        block.object.scale,
        ...block.rows,
      ])
        fingerprint = Math.imul(fingerprint ^ value, 16777619) >>> 0;
    }

    // assert
    // Golden result from the 6502 disassembly block generator: 128 sections, all terrain rows,
    // object positions, directions, widths and the 47/48 difficulty wrap. Heli animation IDs 5/6
    // share a single domain kind here; no original ROM or instruction interpreter is shipped.
    expect(fingerprint).toBe(3228643201);
  });
});
