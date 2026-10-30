// #region Imports

import { describe, expect, it } from 'vitest';
import { RiverRaidGame } from './RiverRaidGame';

// #endregion

function frames(game: RiverRaidGame, count: number): void {
  for (let index = 0; index < count; index++) game.step(1000 / 60);
}
function bankCrash(game: RiverRaidGame): void {
  game.setInput('left', true);
  for (let frame = 0; frame < 400 && game.snapshot.status === 'playing'; frame++)
    game.step(1000 / 60);
  game.releaseInputs();
  frames(game, 96);
}

describe('RiverRaidGame', () => {
  it('waits at the starting mark with three reserves and a full tank until a joystick contact', () => {
    // arrange
    const game = new RiverRaidGame();

    // act
    frames(game, 300);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      score: 0,
      reserves: 3,
      fuel: 1,
      bottom: -32,
      x: 76,
    });

    // act
    game.setInput('up', true);
    frames(game, 24);

    // assert
    expect(game.snapshot.speed).toBe(112);
    expect(game.snapshot.fuel).toBeLessThan(1);
    expect(game.snapshot.bottom).toBeGreaterThan(-32);
  });

  it('uses the original slow and fast limits and returns to cruise when vertical input is released', () => {
    // arrange
    const game = new RiverRaidGame();
    game.setGodMode(true);
    game.setInput('up', true);
    frames(game, 120);

    // act
    game.setInput('up', false);
    frames(game, 70);

    // assert
    expect(game.snapshot.speed).toBe(128);

    // act
    game.setInput('down', true);
    frames(game, 70);

    // assert
    expect(game.snapshot.speed).toBe(64);
  });

  it('guides the existing missile on B and retains its launch column on A', () => {
    // arrange
    const guided = new RiverRaidGame();
    const straight = new RiverRaidGame();
    straight.startNewGame({ players: 1, difficulty: ['a', 'b'] });
    for (const game of [guided, straight]) {
      game.setInput('right', true);
      frames(game, 8);
      game.setInput('fire', true);
      frames(game, 1);
      game.setInput('fire', false);
      game.setInput('right', true);
    }

    // act
    frames(guided, 4);
    frames(straight, 4);

    // assert
    expect(guided.snapshot.missile?.x).toBe(guided.snapshot.x + 5);
    expect(straight.snapshot.missile?.x).toBe(82);
    expect(straight.snapshot.x).toBeGreaterThan(76);
  });

  it('preserves exact position, fuel and crash phase while paused and releases held input', () => {
    // arrange
    const game = new RiverRaidGame();
    game.setInput('right', true);
    frames(game, 12);
    game.pause();
    const paused = game.snapshot;

    // act
    game.setInput('left', true);
    frames(game, 120);

    // assert
    expect(game.snapshot).toEqual(paused);

    // act
    game.togglePause();
    frames(game, 10);

    // assert
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.x).toBe(paused.x);
  });

  it('loses exactly four aircraft and finalizes the pilot only once', () => {
    // arrange
    const game = new RiverRaidGame();

    // act
    for (let flight = 0; flight < 4; flight++) bankCrash(game);
    frames(game, 300);

    // assert
    expect(game.snapshot.status).toBe('ended');
    expect(game.snapshot.results).toEqual([
      { player: 1, score: 0, level: 1, elapsedSeconds: expect.any(Number), outcome: 'lost' },
    ]);
  });

  it('alternates independent player reserves and restarts the original section with a full tank', () => {
    // arrange
    const game = new RiverRaidGame();
    game.startNewGame({ players: 2, difficulty: ['a', 'b'] });
    const initialObjects = game.snapshot.actors;

    // act
    bankCrash(game);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      player: 2,
      reserves: 3,
      fuel: 1,
      x: 76,
      bottom: -32,
    });
    expect(game.snapshot.actors).toEqual(initialObjects);

    // act
    bankCrash(game);

    // assert
    expect(game.snapshot).toMatchObject({ status: 'ready', player: 1, reserves: 2, fuel: 1 });
  });

  it('honors the shared invulnerability mode without ending a player on terrain', () => {
    // arrange
    const game = new RiverRaidGame();
    game.setGodMode(true);
    game.setInput('left', true);

    // act
    frames(game, 300);

    // assert
    expect(game.snapshot).toMatchObject({ status: 'playing', reserves: 3, fuel: 1 });
    expect(game.snapshot.results).toEqual([]);
  });
  it('shoots the original first bridge and restarts above the cleared checkpoint', () => {
    // arrange
    const game = new RiverRaidGame();
    game.setGodMode(true);
    game.setInput('fire', true);
    game.setInput('up', true);

    // act
    for (let frame = 0; frame < 700 && game.snapshot.checkpoint === 0; frame++) frames(game, 1);

    // assert
    expect(game.snapshot.checkpoint).toBe(1024);
    expect(game.snapshot.score).toBeGreaterThanOrEqual(500);
    expect(game.snapshot.level).toBe(2);

    // act
    game.releaseInputs();
    game.setGodMode(false);
    bankCrash(game);

    // assert
    expect(game.snapshot).toMatchObject({ status: 'ready', bottom: 992, fuel: 1, level: 2 });
    expect(game.snapshot.actors.find((actor) => actor.id === 31)?.destroyed).toBe(true);
  });
  it('refuels over the original first depot and can destroy it during refueling for 80 points', () => {
    // arrange
    const game = new RiverRaidGame();
    game.setInput('right', true);
    frames(game, 25);
    game.releaseInputs();
    let before = game.snapshot.fuel;

    // act
    for (let frame = 0; frame < 150 && !game.snapshot.refueling; frame++) {
      before = game.snapshot.fuel;
      frames(game, 1);
    }

    // assert
    expect(game.snapshot.refueling).toBe(true);
    expect(game.snapshot.fuel).toBeGreaterThan(before);
    expect(game.snapshot.score).toBe(0);

    // act
    game.setInput('fire', true);
    frames(game, 3);

    // assert
    expect(game.snapshot.score).toBe(80);
    expect(game.snapshot.actors.find((actor) => actor.id === 2)?.destroyed).toBe(true);
  });

  it('awards a reserve at a crossed 10000-point boundary and caps reserves at nine', () => {
    for (const reserves of [3, 9]) {
      // arrange
      const game = new RiverRaidGame();
      // Set an already-earned score fixture; the real first tanker and ordinary missile award
      // cross the boundary without introducing a production test API or bypassing scoring.
      const pilots = Reflect.get(game, '_players') as { score: number; reserves: number }[];
      pilots[0]!.score = 9990;
      pilots[0]!.reserves = reserves;
      game.setInput('fire', true);

      // act
      frames(game, 15);

      // assert
      expect(game.snapshot.score).toBe(10020);
      expect(game.snapshot.reserves).toBe(Math.min(9, reserves + 1));
    }
  });

  it('ends and finalizes the pilot at one million when a real target overflows the score', () => {
    // arrange
    const game = new RiverRaidGame();
    const pilots = Reflect.get(game, '_players') as { score: number }[];
    pilots[0]!.score = 999990;
    game.setInput('fire', true);

    // act
    frames(game, 130);

    // assert
    expect(game.snapshot.status).toBe('ended');
    expect(game.snapshot.score).toBe(1000000);
    expect(game.snapshot.results).toMatchObject([
      { player: 1, score: 1000000, outcome: 'completed' },
    ]);
  });
});
