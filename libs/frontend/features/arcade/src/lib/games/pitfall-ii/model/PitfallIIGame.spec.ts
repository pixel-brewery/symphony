// #region Imports

import { describe, expect, it } from 'vitest';
import { PitfallIIGame } from './PitfallIIGame';
import { PitfallIIWorld } from './PitfallIIWorld';

// #endregion

function frames(game: PitfallIIGame, count: number): void {
  for (let frame = 0; frame < count; frame += 1) game.step(1000 / 60);
}

describe('PitfallIIGame', () => {
  it('waits for joystick movement, then walks at one Atari pixel per two frames without a timer limit', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setInput('jump', true);
    game.setInput('jump', false);

    // act
    frames(game, 60);
    const ready = game.snapshot;
    game.setInput('right', true);
    frames(game, 60);

    // assert
    expect(ready).toMatchObject({
      status: 'ready',
      score: 4000,
      elapsed: 0,
      player: { x: 36, y: 120 },
    });
    expect(game.snapshot).toMatchObject({
      status: 'playing',
      elapsed: 1,
      player: { x: 66, y: 120 },
    });
    expect(game.snapshot).not.toHaveProperty('lives');
    expect(game.snapshot).not.toHaveProperty('timeRemaining');
  });

  it('replays the original jump deltas and latches horizontal direction during the jump', () => {
    // arrange
    const game = new PitfallIIGame();
    game.placePlayer(40, 120);
    game.setInput('right', true);
    game.setInput('jump', true);
    const heights: number[] = [];

    // act
    for (let frame = 0; frame < 40; frame += 1) {
      frames(game, 1);
      heights.push(game.snapshot.player.y);
      if (frame === 4) {
        game.setInput('right', false);
        game.setInput('left', true);
      }
    }

    // assert
    expect(heights.slice(0, 8)).toEqual([119, 118, 117, 116, 115, 114, 114, 113]);
    expect(Math.min(...heights)).toBe(111);
    expect(heights[31]).toBe(120);
    expect(game.snapshot.player.x).toBeGreaterThan(45);
    expect(game.snapshot.score).toBe(4000);
  });

  it('retains fractional frames, bounds suspension gaps and freezes every paused clock', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setInput('right', true);

    // act
    game.step(8);
    game.step(8);
    game.step(1);
    const before = game.snapshot;
    game.pause();
    game.step(250);
    const paused = game.snapshot;
    game.togglePause();
    game.step(Number.NaN);
    game.step(-10);
    game.step(100000);

    // assert
    expect(before.totalFrames).toBe(1);
    expect(paused.totalFrames).toBe(1);
    expect(paused.displayFrames).toBe(1);
    expect(game.snapshot.totalFrames).toBe(16);
    expect(game.snapshot.player.x).toBe(before.player.x);
  });

  it('descends a ladder at four pixels per eight frames without an accidental-fall charge', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    game.placePlayer(872, 120);
    game.setInput('down', true);

    // act
    frames(game, 80);

    // assert
    expect(game.snapshot.player).toMatchObject({ x: 872, y: 160, pose: 'climb' });
    expect(game.snapshot.score).toBe(4000);
  });

  it('deducts100 only on landing after an accidental fall through successive ladder holes', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    game.placePlayer(72, 165);

    // act
    frames(game, 89);
    const falling = game.snapshot;
    game.setGodMode(false);
    frames(game, 1);

    // assert
    expect(falling.player.y).toBe(254);
    expect(falling.score).toBe(4000);
    expect(game.snapshot.player.y).toBe(255);
    expect(game.snapshot.score).toBe(3900);
    expect(game.snapshot.status).toBe('playing');
  });

  it('supports diving with Down and natural buoyancy without turning Up into free flight', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    game.placePlayer(500, 190);
    game.setInput('down', true);

    // act
    frames(game, 40);
    const submerged = game.snapshot;
    game.setInput('down', false);
    game.setInput('up', true);
    frames(game, 80);

    // assert
    expect(submerged.player).toMatchObject({ pose: 'swim', y: 200 });
    expect(game.snapshot.player.y).toBeGreaterThanOrEqual(183);
    expect(game.snapshot.player.y).toBeLessThanOrEqual(186);
  });

  it('jumps from the right shaft ledge into a balloon, rises with Up and only releases when a bat bursts it', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    game.placePlayer(768, 1200);
    for (let frame = 0; frame < 600; frame += 1) {
      frames(game, 1);
      if (game.snapshot.balloon.visible && game.snapshot.balloon.x >= 764) break;
    }
    game.setInput('jump', true);

    // act
    frames(game, 2);
    const attached = game.snapshot;
    game.setInput('jump', false);
    game.setInput('up', true);
    frames(game, 20);
    const raised = game.snapshot;
    game.setInput('jump', true);
    frames(game, 1);
    const stillAttached = game.snapshot;
    game.setInput('left', true);
    let popped = false;
    let poppedY = 0;
    for (let frame = 0; frame < 1500; frame += 1) {
      frames(game, 1);
      if (game.snapshot.soundEvents.some((event) => event.kind === 'pop')) {
        popped = true;
        poppedY = game.snapshot.player.y;
        break;
      }
    }
    game.releaseInputs();
    frames(game, 120);

    // assert
    expect(attached.balloon.attached).toBe(true);
    expect(raised.player.y).toBeLessThan(attached.player.y - 15);
    expect(stillAttached.balloon.attached).toBe(true);
    expect(popped).toBe(true);
    expect(game.snapshot.balloon.attached).toBe(false);
    expect(poppedY).toBeLessThan(1200);
  });

  it('climbs from the bottom river into the cavern and crosses successive ladder floors', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    game.placePlayer(552, 1355);
    game.setInput('up', true);

    // act
    frames(game, 600);

    // assert
    expect(game.snapshot.player.y).toBeLessThan(1200);
    expect(game.snapshot.player.x).toBeGreaterThanOrEqual(542);
    expect(game.snapshot.player.x).toBeLessThanOrEqual(558);
  });

  it('keeps collected gold through danger and returns to the last cross with original seven-point travel deductions', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    const gold = PitfallIIWorld.items.find((item) => item.kind === 'gold');
    if (!gold) throw new Error('Missing gold');
    game.placePlayer(gold.x, gold.y);
    frames(game, 1);
    game.setGodMode(false);
    game.placePlayer(544, 120);

    // act
    frames(game, 1);
    // The original scorpion bitmap overlaps Harry on the surface.
    const hit = game.snapshot;
    frames(game, 128);
    const frozen = game.snapshot;
    frames(game, 1);
    const returning = game.snapshot;
    frames(game, 600);

    // assert
    expect(hit).toMatchObject({ status: 'returning', score: 9000, goldCollected: 1 });
    expect(frozen.score).toBe(9000);
    expect(returning.score).toBe(8993);
    expect(returning.player.x).toBe(543);
    expect(game.snapshot).toMatchObject({
      status: 'playing',
      goldCollected: 1,
      player: { x: 36, y: 120 },
    });
  });

  it('uses the newly touched cross for recovery and does not impose a game over at zero points', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    const cross = PitfallIIWorld.checkpoints[5];
    if (!cross) throw new Error('Missing checkpoint');
    game.placePlayer(cross.x, cross.y);
    frames(game, 1);
    game.setGodMode(false);
    game.placePlayer(544, 120);

    // act
    frames(game, 1);
    frames(game, 1500);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'playing',
      checkpointId: 5,
      score: 0,
      player: { x: cross.x, y: cross.y },
    });
  });

  it('awards exactly199000 for all treasure, with the third required rescue ending the expedition immediately', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    const gold = PitfallIIWorld.items.filter((item) => item.kind === 'gold');

    // act
    for (const item of gold) {
      game.placePlayer(item.x, item.y);
      frames(game, 1);
    }
    game.placePlayer(180, 165);
    game.setInput('right', true);
    frames(game, 260);
    game.releaseInputs();
    const beforeObjectives = game.snapshot;
    for (const kind of ['rhonda', 'diamond', 'quickclaw']) {
      const item = PitfallIIWorld.items.find((candidate) => candidate.kind === kind);
      if (!item) throw new Error(`Missing ${kind}`);
      game.placePlayer(item.x, item.y);
      frames(game, 1);
    }
    const won = game.snapshot;
    game.setInput('right', true);
    frames(game, 60);

    // assert
    expect(beforeObjectives).toMatchObject({
      goldCollected: 28,
      score: 159000,
      objectives: { rat: true },
    });
    expect(won).toMatchObject({
      status: 'won',
      score: 199000,
      goldCollected: 28,
      objectives: { rhonda: true, quickclaw: true, diamond: true, rat: true },
    });
    expect(game.snapshot.totalFrames).toBe(won.totalFrames);
    expect(game.snapshot.player.x).toBe(won.player.x);
  });

  it('ends after the three required objectives even when optional gold and rat remain', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);

    // act
    for (const kind of ['rhonda', 'quickclaw', 'diamond']) {
      const item = PitfallIIWorld.items.find((candidate) => candidate.kind === kind);
      if (!item) throw new Error(`Missing ${kind}`);
      game.placePlayer(item.x, item.y);
      frames(game, 1);
    }

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'won',
      score: 44000,
      goldCollected: 0,
      objectives: { rat: false },
    });
    expect(game.snapshot.music).toBe('victory');
  });

  it('resets pickups, checkpoints, music and held controls while preserving session invulnerability', () => {
    // arrange
    const game = new PitfallIIGame();
    game.setGodMode(true);
    game.placePlayer(1244, 120);
    frames(game, 1);
    game.setInput('left', true);

    // act
    game.startNewGame();
    frames(game, 60);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      score: 4000,
      goldCollected: 0,
      checkpointId: 0,
      music: 'adventure',
      player: { x: 36, y: 120, invulnerable: true },
    });
  });
});
