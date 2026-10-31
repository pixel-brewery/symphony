// #region Imports

import { describe, expect, it } from 'vitest';
import { createPitfallRoom } from './createPitfallRoom';
import { PitfallGame } from './PitfallGame';

// #endregion

function frames(game: PitfallGame, count: number): void {
  for (let frame = 0; frame < count; frame += 1) game.step(1000 / 60);
}

function roomWith(predicate: (room: ReturnType<typeof createPitfallRoom>) => boolean): number {
  return (
    Array.from({ length: 255 }, (_, index) => index).find((index) =>
      predicate(createPitfallRoom(index, 0, false)),
    ) ?? -1
  );
}

describe('PitfallGame', () => {
  it('resets to 2000 points, three lives and 20 minutes and waits for joystick movement', () => {
    // arrange
    const game = new PitfallGame();

    // act
    frames(game, 60);
    game.setInput('jump', true);
    frames(game, 30);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      score: 2000,
      lives: 3,
      timeRemaining: 1200,
      totalFrames: 0,
      displayFrames: 90,
      player: { x: 16, y: 120 },
      room: { seed: 0xc4 },
    });
    game.setInput('jump', false);
    game.setInput('right', true);
    frames(game, 60);
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.elapsed).toBe(1);
    expect(game.snapshot.player.x).toBe(46);
  });

  it('does not queue a released fire button from the ready screen for a later joystick movement', () => {
    // arrange
    const game = new PitfallGame();
    game.setInput('jump', true);
    frames(game, 20);
    game.setInput('jump', false);
    frames(game, 20);

    // act
    game.setInput('right', true);
    frames(game, 1);

    // assert
    expect(game.snapshot.player.y).toBe(120);
    expect(game.snapshot.soundEvents).toEqual([]);
    game.setInput('jump', true);
    frames(game, 1);
    expect(game.snapshot.player.y).toBe(119);
  });

  it('uses the original integer jump sequence and locks horizontal direction after its first two frames', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(0, 24, 120);
    game.setInput('right', true);
    game.setInput('jump', true);

    // act
    const heights: number[] = [];
    for (let frame = 0; frame < 34; frame += 1) {
      frames(game, 1);
      heights.push(game.snapshot.player.y);
      if (frame === 4) {
        game.setInput('right', false);
        game.setInput('left', true);
      }
    }

    // assert
    expect(heights.slice(0, 10)).toEqual([119, 118, 117, 116, 115, 114, 113, 112, 112, 111]);
    expect(Math.min(...heights)).toBe(109);
    expect(heights.at(-1)).toBe(120);
    expect(game.snapshot.player.x).toBeGreaterThan(38);
    expect(game.snapshot.lives).toBe(3);
    frames(game, 4);
    expect(game.snapshot.player.y).toBe(120);
  });

  it('retains fractional frames, bounds stale host timestamps and freezes both pause clocks', () => {
    // arrange
    const game = new PitfallGame();
    game.setInput('right', true);

    // act
    game.step(8);
    game.step(8);
    game.step(1);
    const before = game.snapshot;
    game.pause();
    game.step(1000);

    // assert
    expect(before.totalFrames).toBe(1);
    expect(before.displayFrames).toBe(1);
    expect(game.snapshot.totalFrames).toBe(1);
    expect(game.snapshot.displayFrames).toBe(1);
    game.togglePause();
    game.step(Number.NaN);
    game.step(-10);
    game.step(100000);
    expect(game.snapshot.totalFrames).toBe(16);
    expect(game.snapshot.player.x).toBe(before.player.x);
  });

  it('wraps both surface edges by one room and both tunnel edges by three rooms', () => {
    // arrange
    const game = new PitfallGame();

    // act
    // assert
    for (const [room, x, direction, layer, expected] of [
      [254, 148, 'right', 'surface', 0],
      [0, 8, 'left', 'surface', 254],
      [254, 148, 'right', 'underground', 2],
      [2, 8, 'left', 'underground', 254],
    ] as const) {
      game.placePlayer(room, x, layer === 'surface' ? 120 : 174, layer);
      game.setInput(direction, true);
      frames(game, 2);
      expect(game.snapshot.room.index).toBe(expected);
      expect(game.snapshot.player.x).toBe(direction === 'right' ? 8 : 148);
    }
  });

  it('descends from beside the center hole, climbs the original ladder cadence and jumps off its top', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(0, 72, 120);
    game.setInput('down', true);

    // act
    frames(game, 80);

    // assert
    expect(game.snapshot.player).toMatchObject({ x: 76, y: 174, layer: 'underground' });
    expect(game.snapshot.score).toBe(2000);
    game.releaseInputs();
    game.setInput('up', true);
    frames(game, 80);
    expect(game.snapshot.player).toMatchObject({ x: 76, y: 134, pose: 'climb' });
    game.releaseInputs();
    game.setInput('left', true);
    frames(game, 35);
    expect(game.snapshot.player.y).toBe(120);
    expect(game.snapshot.player.x).toBeLessThan(65);
    expect(game.snapshot.score).toBe(2000);
  });

  it('falls into an ordinary hole at one pixel per frame, charging 100 only once', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(1, 50, 120);

    // act
    frames(game, 1);

    // assert
    expect(game.snapshot.player.y).toBe(122);
    expect(game.snapshot.score).toBe(1900);
    expect(game.snapshot.soundEvents.map((event) => event.kind)).toContain('fall');
    frames(game, 52);
    expect(game.snapshot.player).toMatchObject({ x: 50, y: 174 });
    expect(game.snapshot.score).toBe(1900);
  });

  it('blocks a tunnel wall from both sides, including while jumping', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(0, 120, 174, 'underground');
    game.setInput('right', true);
    game.setInput('jump', true);

    // act
    frames(game, 100);

    // assert
    expect(game.snapshot.room.index).toBe(0);
    expect(game.snapshot.player.x).toBeLessThan(136);
    game.placePlayer(4, 28, 174, 'underground');
    game.setInput('left', true);
    frames(game, 90);
    expect(game.snapshot.room.index).toBe(4);
    expect(game.snapshot.player.x).toBeGreaterThan(17);
  });

  it('moves scorpions toward Harry every eighth frame and resets their position when a room changes', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(2, 16, 120);

    // act
    frames(game, 16);

    // assert
    expect(game.snapshot.room.scorpion).toEqual({ x: 74, facing: -1 });
    game.placePlayer(2, 148, 120);
    game.setInput('right', true);
    frames(game, 2);
    expect(game.snapshot.room.scorpion?.x).toBe(76);
  });

  it.each(['fire', 'snake', 'scorpion', 'tar', 'water'] as const)(
    'loses a life to %s after the death tune and uses the original respawn layer',
    (hazard) => {
      // arrange
      const game = new PitfallGame();
      const underground = hazard === 'scorpion';
      const room = roomWith((entry) =>
        hazard === 'scorpion'
          ? entry.scorpion !== null
          : hazard === 'tar' || hazard === 'water'
            ? entry.pit?.kind === hazard && entry.sceneType !== 4
            : entry.obstacle?.kind === hazard,
      );
      game.placePlayer(
        room,
        underground ? 76 : hazard === 'tar' || hazard === 'water' ? 50 : 124,
        underground ? 174 : 120,
        underground ? 'underground' : 'surface',
      );

      // act
      frames(game, 24);
      const remaining = game.snapshot.deathFramesRemaining;
      const elapsed = game.snapshot.elapsed;
      frames(game, remaining);

      // assert
      expect(remaining).toBeGreaterThan(0);
      expect(game.snapshot.lives).toBe(2);
      expect(game.snapshot.elapsed).toBe(elapsed);
      expect(game.snapshot.player).toMatchObject({
        x: 20,
        y: underground ? 152 : 55,
        invulnerable: false,
      });
      frames(game, underground ? 22 : 65);
      expect(game.snapshot.player.y).toBe(underground ? 174 : 120);
    },
  );

  it.each(['fire', 'snake', 'scorpion', 'tar', 'water'] as const)(
    'ignores %s without starting a death or spending time in God mode',
    (hazard) => {
      // arrange
      const game = new PitfallGame();
      const underground = hazard === 'scorpion';
      const room = roomWith((entry) =>
        hazard === 'scorpion'
          ? entry.scorpion !== null
          : hazard === 'tar' || hazard === 'water'
            ? entry.pit?.kind === hazard && entry.sceneType !== 4
            : entry.obstacle?.kind === hazard,
      );
      game.setGodMode(true);
      game.placePlayer(
        room,
        underground ? 76 : hazard === 'tar' || hazard === 'water' ? 50 : 124,
        underground ? 174 : 120,
        underground ? 'underground' : 'surface',
      );

      // act
      frames(game, 180);

      // assert
      expect(game.snapshot).toMatchObject({
        status: 'playing',
        lives: 3,
        elapsed: 0,
        deathFramesRemaining: 0,
        player: { invulnerable: true },
      });
    },
  );

  it('uses pixel collisions so the original low jump can clear a fire', () => {
    // arrange
    const game = new PitfallGame();
    const room = roomWith((entry) => entry.obstacle?.kind === 'fire');
    game.placePlayer(room, 115, 120);
    game.setInput('right', true);
    game.setInput('jump', true);

    // act
    frames(game, 40);

    // assert
    expect(game.snapshot.lives).toBe(3);
    expect(game.snapshot.deathFramesRemaining).toBe(0);
    expect(game.snapshot.player.x).toBe(135);
  });

  it('charges one point on every stationary-log contact without removing a life', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(0, 124, 120);

    // act
    frames(game, 8);

    // assert
    expect(game.snapshot.score).toBe(1992);
    expect(game.snapshot.lives).toBe(3);
    expect(game.snapshot.player).toMatchObject({ pose: 'hurt', spriteOffsetY: 5 });
  });

  it('walks through stationary logs without score loss in God mode', () => {
    // arrange
    const game = new PitfallGame();
    game.setGodMode(true);
    game.placePlayer(0, 124, 120);
    game.setInput('right', true);

    // act
    frames(game, 8);

    // assert
    expect(game.snapshot.score).toBe(2000);
    expect(game.snapshot.player.pose).not.toBe('hurt');
    expect(game.snapshot.player.x).toBeGreaterThan(124);
  });

  it('keeps the small crocodile nose safe even with jaws open, but sinks through the open mouth', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(3, 62, 120);

    // act
    frames(game, 256);

    // assert
    expect(game.snapshot.player.y).toBe(120);
    expect(game.snapshot.lives).toBe(3);
    game.placePlayer(3, 58, 120);
    frames(game, 22);
    expect(game.snapshot.deathFramesRemaining).toBeGreaterThan(0);
  });

  it('freezes shifting-pit geometry during a fatal fall', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(6, 50, 120);
    frames(game, 1);
    const pit = game.snapshot.room.pit;

    // act
    frames(game, 16);

    // assert
    expect(game.snapshot.room.pit).toEqual(pit);
    expect(game.snapshot.player.y).toBeGreaterThan(120);
  });

  it('grabs the actual rope while airborne, follows the original accumulator, and releases only with down', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(2, 75, 114);

    // act
    frames(game, 1);

    // assert
    expect(game.snapshot.vine?.attached).toBe(true);
    expect(game.snapshot.soundEvents.map((event) => event.kind)).toContain('swing');
    frames(game, 30);
    expect(game.snapshot.vine?.slope).toBeGreaterThan(0);
    expect(game.snapshot.player.x).toBeLessThan(75);
    game.setInput('jump', true);
    frames(game, 1);
    expect(game.snapshot.vine?.attached).toBe(true);
    game.setInput('down', true);
    frames(game, 1);
    expect(game.snapshot.vine?.attached).toBe(false);
    frames(game, 3);
    expect(game.snapshot.vine?.attached).toBe(false);
  });

  it('matches source-sampled vine positions across both extremes and the eight-bit phase wrap', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(2, 75, 114);
    const samples = [
      [1, 0, -1, 75, 119],
      [2, 1, -1, 75, 119],
      [3, 8, -1, 73, 119],
      [16, 49, -1, 63, 118],
      [31, 88, -1, 53, 113],
      [64, 121, -1, 45, 109],
      [96, 110, -1, 48, 111],
      [128, 55, -1, 62, 118],
      [160, 56, 1, 89, 117],
      [192, 112, 1, 103, 110],
      [224, 126, 1, 106, 109],
      [256, 87, 1, 96, 114],
      [300, 48, -1, 63, 118],
    ] as const;
    let previous = 0;

    // act
    const observed = samples.map(([frame]) => {
      frames(game, frame - previous);
      previous = frame;
      return [
        frame,
        game.snapshot.vine?.slope,
        game.snapshot.vine?.direction,
        game.snapshot.player.x,
        game.snapshot.player.y,
      ];
    });

    // assert
    expect(observed).toEqual(samples);
    expect(game.snapshot.lives).toBe(3);
  });

  it('resets room-local rolling logs while retaining the global hazard clock on a revisit', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(1, 16, 120);

    // act
    frames(game, 60);
    const previous = game.snapshot;
    game.placePlayer(1, 148, 120);

    // assert
    expect(previous.room.logs[0]?.x).toBe(94);
    expect(game.snapshot.room.logs[0]?.x).toBe(124);
    expect(game.snapshot.frame).toBe(previous.frame);
    expect(game.snapshot.elapsed).toBe(previous.elapsed);
  });

  it('collects all 32 unique treasures once, freezes the final score and supports a clean restart', () => {
    // arrange
    const game = new PitfallGame();
    const rooms = [
      6, 28, 41, 43, 46, 49, 51, 57, 69, 72, 77, 79, 83, 95, 118, 121, 130, 135, 137, 144, 148, 157,
      164, 174, 176, 191, 193, 195, 197, 206, 228, 238,
    ];
    let lastEventId = 0;

    // act
    for (const room of rooms) {
      game.placePlayer(room, 124, 120);
      frames(game, 1);
      lastEventId = game.snapshot.soundEvents.at(-1)?.id ?? lastEventId;
      if (room !== 238) {
        const score = game.snapshot.score;
        game.placePlayer(room, 124, 120);
        frames(game, 1);
        expect(game.snapshot.score).toBe(score);
      }
    }
    const completed = game.snapshot;
    frames(game, 120);

    // assert
    expect(completed).toMatchObject({
      status: 'won',
      terminalReason: 'treasures',
      score: 114000,
      treasuresCollected: 32,
    });
    expect(game.snapshot.elapsed).toBe(completed.elapsed);
    expect(game.snapshot.player).toEqual(completed.player);
    game.startNewGame();
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      terminalReason: null,
      score: 2000,
      treasuresCollected: 0,
      lives: 3,
      totalFrames: 0,
    });
    game.setInput('right', true);
    game.setInput('jump', true);
    frames(game, 1);
    expect(game.snapshot.soundEvents[0]?.id).toBeGreaterThan(lastEventId);
  });

  it('ends after the third death and freezes terminal input and the expedition clock', () => {
    // arrange
    const game = new PitfallGame();
    const room = roomWith((entry) => entry.obstacle?.kind === 'fire');

    // act
    for (let life = 0; life < 3; life += 1) {
      game.placePlayer(room, 124, 120);
      frames(game, 133);
    }
    const final = game.snapshot;
    game.setInput('right', true);
    frames(game, 60);

    // assert
    expect(final).toMatchObject({ status: 'gameOver', terminalReason: 'lives', lives: 0 });
    expect(game.snapshot.elapsed).toBe(final.elapsed);
    expect(game.snapshot.player).toEqual(final.player);
  });

  it('expires at precisely 20 active minutes without a round or score reset', () => {
    // arrange
    const game = new PitfallGame();
    game.placePlayer(0, 16, 120);

    // act
    frames(game, 72000);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'gameOver',
      terminalReason: 'time',
      timeRemaining: 0,
      elapsed: 1200,
      score: 2000,
      lives: 3,
    });
  });

  it('freezes the expedition countdown while God mode is active', () => {
    // arrange
    const game = new PitfallGame();
    game.setGodMode(true);
    game.placePlayer(0, 16, 120);

    // act
    frames(game, 72000);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'playing',
      terminalReason: null,
      timeRemaining: 1200,
      elapsed: 0,
      lives: 3,
    });
  });
});
