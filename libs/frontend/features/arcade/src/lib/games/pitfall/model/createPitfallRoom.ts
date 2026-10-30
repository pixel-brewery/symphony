// #region Imports

import type { IPitfallRoom } from './IPitfallRoom';
import type { IPitfallRoomDynamics } from './IPitfallRoomDynamics';
import { nextPitfallSeed } from './nextPitfallSeed';

// #endregion

const TREASURE_KINDS = ['moneyBag', 'silver', 'gold', 'diamond'] as const;
const LOG_COPIES: readonly (readonly number[])[] = [
  [0],
  [0, 16],
  [0, 32],
  [0, 32, 64],
  [0],
  [0, 32, 64],
];
const TREE_POSITIONS = [
  [16, 48, 108, 140],
  [24, 56, 100, 132],
  [32, 64, 92, 124],
  [36, 68, 88, 120],
] as const;
const ROOM_SEEDS = Array.from({ length: 255 }, (_, index) => {
  let seed = 0xc4;
  for (let step = 0; step < index; step += 1) seed = nextPitfallSeed(seed);
  return seed;
});

/**
 * Decodes the original reversible 255-room world and global 256-frame hazard clock.
 * Room zero is reset seed 0xC4; treasure rooms are precisely scene type five.
 * @param roomIndex - Circular room index, increasing when walking right.
 * @param elapsed - Active simulation time in seconds, excluding death and pause delays.
 * @param treasureCollected - Whether this room's unique treasure has been taken.
 * @param dynamics - Actual per-room object positions and frozen pit clock.
 * @public
 */
export function createPitfallRoom(
  roomIndex: number,
  elapsed: number,
  treasureCollected: boolean,
  dynamics?: IPitfallRoomDynamics,
): IPitfallRoom {
  const index = ((Math.trunc(roomIndex) % 255) + 255) % 255;
  const seed = ROOM_SEEDS[index] ?? 0xc4;
  const sceneType = (seed >> 3) & 7;
  const objectType = seed & 7;
  const treePattern = seed >> 6;
  const frame = Math.floor(elapsed * 60 + 0.000001) & 255;
  const pitFrame = (dynamics?.pitFrame ?? frame) & 255;
  const quarter = pitFrame >> 6;
  // QuickSandTab: closing 0..15, held closed, opening 15..0, held open.
  const pitSize =
    quarter === 0
      ? (pitFrame >> 2) & 15
      : quarter === 1
        ? 15
        : quarter === 2
          ? 15 - ((pitFrame >> 2) & 15)
          : 0;
  const inset = sceneType >= 5 ? ([0, 4, 8, 16, 28][pitSize] ?? 64) : 0;
  const pitWidth = Math.max(0, 64 - 2 * inset);
  const objectX =
    dynamics?.objectX ??
    (objectType < 4 ? (((124 - Math.floor(elapsed * 30)) % 160) + 160) % 160 : 124);
  const animationFrame = dynamics?.animationFrame ?? (frame >> 4) & 1;
  const treasureKind = TREASURE_KINDS[objectType & 3] ?? 'moneyBag';
  return {
    index,
    seed,
    sceneType,
    objectType,
    treePattern,
    trees: TREE_POSITIONS[treePattern] ?? TREE_POSITIONS[0],
    ladderX: sceneType < 2 ? 76 : null,
    wall: sceneType < 2 ? { x: seed & 128 ? 136 : 17, width: 8 } : null,
    holes:
      sceneType === 0
        ? [{ x: 76, width: 8 }]
        : sceneType === 1
          ? [
              { x: 48, width: 12 },
              { x: 76, width: 8 },
              { x: 100, width: 12 },
            ]
          : [],
    pit:
      sceneType >= 2
        ? {
            kind: sceneType === 3 || sceneType === 4 || sceneType === 7 ? 'water' : 'tar',
            x: 48 + inset,
            width: pitWidth,
            shifting: sceneType >= 5,
            phase:
              sceneType < 5 || pitSize === 0
                ? 'open'
                : pitWidth === 0
                  ? 'closed'
                  : quarter === 0
                    ? 'closing'
                    : 'opening',
          }
        : null,
    crocodiles:
      sceneType === 4
        ? [60, 76, 92].map((x) => ({ x, width: 8, mouthOpen: (frame & 128) === 0 }))
        : [],
    logs:
      sceneType !== 4 && sceneType !== 5 && objectType < 6
        ? (LOG_COPIES[objectType] ?? []).map((offset) => ({
            // TIA copies outside the right edge are clipped, never wrapped independently.
            x: (objectX + offset) & 255,
            y: 111 + ((objectX & 6) === 6 ? 1 : 0),
            width: 8,
            moving: objectType < 4,
            animationFrame: (objectX >> 1) & 1,
          }))
        : [],
    obstacle:
      sceneType !== 4 && sceneType !== 5 && objectType >= 6
        ? { kind: objectType === 6 ? 'fire' : 'snake', x: 124, animationFrame }
        : null,
    treasure:
      sceneType === 5 && !treasureCollected
        ? { kind: treasureKind, x: 124, value: 2000 + (objectType & 3) * 1000, animationFrame }
        : null,
    scorpion:
      sceneType < 2
        ? null
        : { x: dynamics?.scorpionX ?? 76, facing: dynamics?.scorpionFacing ?? -1 },
    vine:
      sceneType === 2 ||
      sceneType === 3 ||
      sceneType === 6 ||
      (sceneType === 4 && (objectType & 2) !== 0),
  };
}
