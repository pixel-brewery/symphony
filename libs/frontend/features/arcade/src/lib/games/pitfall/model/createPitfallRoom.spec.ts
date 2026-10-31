// #region Imports

import { describe, expect, it } from 'vitest';
import { createPitfallRoom } from './createPitfallRoom';

// #endregion

// Source fixtures: ContRandom, HoleBoundsTab, NuSize1Tab, QuickSandTab and original map.
const TREASURE_ROOMS = [
  6, 28, 41, 43, 46, 49, 51, 57, 69, 72, 77, 79, 83, 95, 118, 121, 130, 135, 137, 144, 148, 157,
  164, 174, 176, 191, 193, 195, 197, 206, 228, 238,
];

describe('createPitfallRoom', () => {
  it('decodes the original reset scene and first rightward scenes', () => {
    // arrange
    const expectedSeeds = [
      0xc4, 0x89, 0x12, 0x25, 0x4b, 0x97, 0x2e, 0x5c, 0xb8, 0x70, 0xe0, 0xc0, 0x81, 0x03, 0x06,
      0x0c, 0x19, 0x32, 0x64, 0xc9, 0x92, 0x24, 0x49, 0x93, 0x26, 0x4d, 0x9b, 0x37, 0x6e, 0xdc,
      0xb9, 0x72,
    ];

    // act
    const rooms = expectedSeeds.map((_, index) => createPitfallRoom(index, 0, false));

    // assert
    expect(rooms.map((room) => room.seed)).toEqual(expectedSeeds);
    expect(rooms[0]).toMatchObject({
      sceneType: 0,
      objectType: 4,
      treePattern: 3,
      ladderX: 76,
      wall: { x: 136 },
      scorpion: null,
      vine: false,
      logs: [{ x: 124, moving: false }],
    });
    expect(rooms[1]).toMatchObject({
      sceneType: 1,
      wall: { x: 136 },
      logs: [{ x: 124 }, { x: 140 }],
    });
    expect(rooms[2]).toMatchObject({
      sceneType: 2,
      pit: { kind: 'tar', width: 64 },
      vine: true,
      ladderX: null,
    });
    expect(rooms[3]).toMatchObject({
      sceneType: 4,
      vine: false,
      crocodiles: [{ x: 60 }, { x: 76 }, { x: 92 }],
    });
    expect(rooms[4]).toMatchObject({ wall: { x: 17 } });
  });

  it('contains all 255 nonzero seeds and wraps the circular world in either direction', () => {
    // arrange
    const rooms = Array.from({ length: 255 }, (_, index) => createPitfallRoom(index, 0, false));

    // act
    const seeds = new Set(rooms.map((room) => room.seed));

    // assert
    expect(seeds.size).toBe(255);
    expect(seeds.has(0)).toBe(false);
    expect(createPitfallRoom(255, 0, false)).toEqual(rooms[0]);
    expect(createPitfallRoom(-1, 0, false)).toEqual(rooms[254]);
    expect(new Set(rooms.map((room) => room.sceneType)).size).toBe(8);
  });

  it('places the exact 32 treasures, eight of each kind, for a 114000 point perfect run', () => {
    // arrange
    const rooms = Array.from({ length: 255 }, (_, index) => createPitfallRoom(index, 0, false));

    // act
    const treasures = rooms.filter((room) => room.treasure !== null);

    // assert
    expect(treasures.map((room) => room.index)).toEqual(TREASURE_ROOMS);
    for (const kind of ['moneyBag', 'silver', 'gold', 'diamond'])
      expect(treasures.filter((room) => room.treasure?.kind === kind)).toHaveLength(8);
    expect(treasures.reduce((sum, room) => sum + (room.treasure?.value ?? 0), 2000)).toBe(114000);
    expect(createPitfallRoom(6, 0, true).treasure).toBeNull();
    expect(treasures.every((room) => room.treasure?.x === 124 && room.sceneType === 5)).toBe(true);
  });

  it('keeps every original scene type, its vine condition and mutually exclusive wall/scorpion', () => {
    // arrange
    const rooms = Array.from({ length: 255 }, (_, index) => createPitfallRoom(index, 0, false));

    // act
    const byScene = Array.from({ length: 8 }, (_, sceneType) =>
      rooms.filter((room) => room.sceneType === sceneType),
    );

    // assert
    expect(byScene.map((group) => group.length)).toEqual([31, 32, 32, 32, 32, 32, 32, 32]);
    for (const room of rooms) {
      expect(room.wall !== null).toBe(room.sceneType < 2);
      expect(room.scorpion !== null).toBe(room.sceneType >= 2);
      expect(room.ladderX !== null).toBe(room.sceneType < 2);
      expect(room.vine).toBe(
        [2, 3, 6].includes(room.sceneType) || (room.sceneType === 4 && (room.objectType & 2) !== 0),
      );
    }
    expect(byScene[3]?.[0]?.pit).toMatchObject({ kind: 'water', shifting: false });
    expect(byScene[7]?.[0]?.pit).toMatchObject({ kind: 'water', shifting: true });
  });

  it.each([
    [0, 64, 'open'],
    [4, 56, 'closing'],
    [8, 48, 'closing'],
    [12, 32, 'closing'],
    [16, 8, 'closing'],
    [20, 0, 'closed'],
    [171, 0, 'closed'],
    [172, 8, 'opening'],
    [176, 32, 'opening'],
    [180, 48, 'opening'],
    [184, 56, 'opening'],
    [188, 64, 'open'],
    [255, 64, 'open'],
  ] as const)(
    'uses the original discrete shifting-pit bounds at frame %i',
    (frame, width, phase) => {
      // arrange
      // act
      const room = createPitfallRoom(6, frame / 60, false);

      // assert
      expect(room.pit).toMatchObject({ width, phase });
      expect(createPitfallRoom(6, (frame + 256) / 60, false).pit).toEqual(room.pit);
    },
  );

  it('opens crocodile jaws on bit seven of the 256-frame clock and preserves the nose locations', () => {
    // arrange
    // act
    const open = createPitfallRoom(3, 127 / 60, false);
    const closed = createPitfallRoom(3, 128 / 60, false);

    // assert
    expect(open.crocodiles.every((crocodile) => crocodile.mouthOpen)).toBe(true);
    expect(closed.crocodiles.every((crocodile) => !crocodile.mouthOpen)).toBe(true);
    expect(closed.crocodiles.map((crocodile) => crocodile.x)).toEqual([60, 76, 92]);
  });

  it('uses one, close-double, wide-double and spaced-triple logs without wrapping individual copies', () => {
    // arrange
    const rooms = Array.from({ length: 255 }, (_, index) => createPitfallRoom(index, 0, false));
    const expected = [[124], [124, 140], [124, 156], [124, 156, 188], [124], [124, 156, 188]];

    // act
    // assert
    for (let type = 0; type < 6; type += 1) {
      const room = rooms.find((entry) => entry.objectType === type && entry.logs.length > 0);
      expect(room?.logs.map((log) => log.x)).toEqual(expected[type]);
      if (room)
        expect(createPitfallRoom(room.index, 1, false).logs[0]?.x).toBe(type < 4 ? 94 : 124);
    }
  });
});
