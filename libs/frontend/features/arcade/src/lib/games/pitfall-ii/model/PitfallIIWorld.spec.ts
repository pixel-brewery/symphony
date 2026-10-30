// #region Imports

import { describe, expect, it } from 'vitest';
import { PitfallIIWorld } from './PitfallIIWorld';

// #endregion

describe('PitfallIIWorld', () => {
  it('contains the complete fixed cavern, all treasure and all healing stations', () => {
    // arrange
    const world = PitfallIIWorld;

    // act
    const gold = world.items.filter((item) => item.kind === 'gold');
    const objectives = world.items.filter((item) => item.kind !== 'gold');

    // assert
    expect(world.width).toBe(8 * 160);
    expect(world.levelHeight).toBe(45);
    expect(gold).toHaveLength(28);
    expect(objectives.map((item) => item.kind).sort()).toEqual([
      'diamond',
      'quickclaw',
      'rat',
      'rhonda',
    ]);
    expect(world.checkpoints).toHaveLength(6);
    expect(world.hazards).toHaveLength(100);
    expect(world.ladders).toHaveLength(83);
    expect(world.water.at(-1)).toMatchObject({ x: 0, y: 1344, width: 1280, height: 36 });
  });

  it('preserves the separated left shaft, balloon shaft, staggered ledges and ladder chutes', () => {
    // arrange
    const world = PitfallIIWorld;

    // act
    const rowSeven = world.platforms.filter((platform) => platform.y === 390);
    const easternChute = rowSeven.filter((platform) => platform.x >= 1120);
    const balloonBats = world.hazards.filter((hazard) => hazard.kind === 'balloonBat');

    // assert
    expect(rowSeven).toContainEqual({ x: 445, y: 390, width: 35, height: 13 });
    expect(rowSeven).toContainEqual({ x: 640, y: 390, width: 29, height: 13 });
    expect(easternChute.map(({ x, width }) => [x, width])).toEqual([
      [1120, 48],
      [1180, 12],
      [1200, 12],
      [1224, 56],
    ]);
    expect(balloonBats.every((bat) => bat.x >= 640 && bat.x < 800)).toBe(true);
    expect(world.items.find((item) => item.kind === 'diamond')).toMatchObject({ x: 229, y: 750 });
  });
});

describe('PitfallIIWorld traversal', () => {
  it('connects every treasure and rescue to the starting surface through ledges, shafts, ladders, water and the single balloon shaft', () => {
    // arrange
    const world = PitfallIIWorld;
    const supports = [...world.platforms, ...world.water];
    const blocked = (x1: number, y1: number, x2: number, y2: number): boolean =>
      world.walls.some((wall) => {
        if (wall.x <= Math.min(x1, x2) || wall.x >= Math.max(x1, x2)) return false;
        const y = y1 + ((wall.x - x1) / (x2 - x1)) * (y2 - y1);
        return y > wall.y && y - 16 < wall.y + wall.height;
      });
    const adjacent = supports.map(() => new Set<number>());
    for (const [a, from] of supports.entries()) {
      for (const [b, to] of supports.entries()) {
        if (a === b) continue;
        const fromX = from.x + from.width / 2;
        const toX = to.x + to.width / 2;
        const gap = Math.max(0, to.x - from.x - from.width, from.x - to.x - to.width);
        const drop = to.y - from.y;
        const crossingStart = fromX < toX ? from.x + from.width - 4 : from.x + 4;
        const crossingEnd = fromX < toX ? to.x + 4 : to.x + to.width - 4;
        if (drop >= 0 && gap <= drop / 2 + 16 && !blocked(crossingStart, from.y, crossingEnd, to.y))
          adjacent[a]?.add(b);
        const sameWater = world.water.some(
          (water) =>
            from.y >= water.y - 12 &&
            from.y <= water.y + water.height &&
            to.y >= water.y - 12 &&
            to.y <= water.y + water.height &&
            from.x <= water.x + water.width &&
            from.x + from.width >= water.x &&
            to.x <= water.x + water.width &&
            to.x + to.width >= water.x,
        );
        if (sameWater && !blocked(fromX, from.y, toX, to.y)) adjacent[a]?.add(b);
        const ladder = world.ladders.some(
          (value) =>
            value.x >= from.x - 8 &&
            value.x <= from.x + from.width + 8 &&
            value.x >= to.x - 8 &&
            value.x <= to.x + to.width + 8 &&
            from.y >= value.y - 1 &&
            from.y <= value.y + value.height + 1 &&
            to.y >= value.y - 1 &&
            to.y <= value.y + value.height + 1,
        );
        if (ladder) adjacent[a]?.add(b);
        // Balloons lift through chamber4; only open shaft boundaries permit a landing.
        const byBalloon =
          from.x < 808 &&
          from.x + from.width > 632 &&
          to.x < 808 &&
          to.x + to.width > 632 &&
          to.y >= 345 &&
          from.y > to.y;
        if (byBalloon && !blocked(720, to.y - 16, toX, to.y)) adjacent[a]?.add(b);
      }
    }
    const start = supports.findIndex(
      (support) => support.y === 120 && support.x <= 36 && support.x + support.width > 36,
    );
    const reached = new Set([start]);
    const queue = [start];

    // act
    for (let index = 0; index < queue.length; index += 1) {
      for (const next of adjacent[queue[index] ?? -1] ?? []) {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    const inaccessible = world.items.filter(
      (item) =>
        !supports.some(
          (support, index) =>
            reached.has(index) &&
            item.x + 4 >= support.x - 4 &&
            item.x + 4 < support.x + support.width + 4 &&
            (Math.abs(item.y - support.y) < 1 ||
              (world.water.includes(support) &&
                item.y >= support.y &&
                item.y <= support.y + support.height)),
        ),
    );

    // assert
    expect(inaccessible.map((item) => item.id)).toEqual([]);
  });
});
