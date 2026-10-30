// #region Imports

import { describe, expect, it } from 'vitest';
import { BreakoutGame } from './BreakoutGame';
import type { IBreakoutOptions } from './IBreakoutOptions';

// #endregion

const FRAME = 1000 / 60;

function configured(options: Partial<IBreakoutOptions> = {}): BreakoutGame {
  const game = new BreakoutGame();
  game.newGame({ variation: 1, players: 1, difficultyA: 'A', difficultyB: 'A', ...options });
  return game;
}

function hitBrick(game: BreakoutGame, id: number): void {
  const brick = game.snapshot.bricks[id];
  if (!brick) throw new Error('Expected a brick for this simulation.');
  game.placeBall(brick.x - 1.2, brick.y + 2, 72, 0);
  game.step(FRAME);
}

function loseBall(game: BreakoutGame): void {
  game.placeBall(20, 194, 0, 72);
  game.step(FRAME);
}

function clearWall(game: BreakoutGame): void {
  for (const brick of game.snapshot.bricks) if (brick.alive) hitBrick(game, brick.id);
}

describe('BreakoutGame', () => {
  it('starts with the original six rows, eighteen columns and five balls', () => {
    // arrange
    const game = configured();
    // act
    const snapshot = game.snapshot;
    // assert
    expect(snapshot.status).toBe('ready');
    expect(snapshot.bricks).toHaveLength(108);
    expect(new Set(snapshot.bricks.map((brick) => brick.row)).size).toBe(6);
    expect(new Set(snapshot.bricks.map((brick) => brick.column)).size).toBe(18);
    expect(snapshot.teams[0]?.ballsRemaining).toBe(5);
  });

  it.each([1, 2, 3, 4] as const)(
    'allocates the original controller teams for %i players',
    (players) => {
      // arrange
      const game = configured({ players });
      // act
      const snapshot = game.snapshot;
      // assert
      const expected =
        players === 1
          ? [[1]]
          : players === 2
            ? [[1], [2]]
            : players === 3
              ? [[1, 2], [3]]
              : [
                  [1, 2],
                  [3, 4],
                ];
      expect(snapshot.teams.map((team) => team.players)).toEqual(expected);
      expect(snapshot.paddles.length).toBe(players >= 3 ? 2 : 1);
    },
  );

  it('uses the documented three-quarter B paddle and independent team switches', () => {
    // arrange
    const game = configured({ players: 2, difficultyA: 'A', difficultyB: 'B' });
    const widthA = game.snapshot.paddles[0]?.width ?? 0;
    // act
    loseBall(game);
    // assert
    expect(game.snapshot.currentTeamIndex).toBe(1);
    expect(game.snapshot.paddles[0]?.width).toBe(widthA * 0.75);
  });

  it('keeps partner paddles inside their own halves for keyboard and pointer input', () => {
    // arrange
    const game = configured({ players: 4 });
    game.setInput('right', true);
    game.setInput('secondLeft', true);
    // act
    for (let frame = 0; frame < 120; frame++) game.step(FRAME);
    // assert
    const [left, right] = game.snapshot.paddles;
    expect((left?.x ?? 0) + (left?.width ?? 0)).toBeLessThanOrEqual(80);
    expect(right?.x).toBeGreaterThanOrEqual(80);
    game.movePointer(1);
    expect((game.snapshot.paddles[1]?.x ?? 0) + (right?.width ?? 0)).toBe(156);
  });

  it('awaits a red-button serve without charging the playing timer', () => {
    // arrange
    const game = configured({ variation: 5 });
    game.step(250);
    expect(game.snapshot.teams[0]?.elapsedSeconds).toBe(0);
    // act
    game.setInput('fire', true);
    game.step(250);
    // assert
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.ball.vy).toBeLessThan(0);
    expect(game.snapshot.teams[0]?.elapsedSeconds).toBeCloseTo(0.25);
    expect(game.snapshot.teams[0]?.ballsRemaining).toBe(5);
  });

  it.each([3, 7, 11])('catches while fire is held and releases in variation %i', (variation) => {
    // arrange
    const game = configured({ variation });
    game.setInput('fire', true);
    game.placeBall(80, 174, 0, 72);
    // act
    game.step(FRAME);
    // assert
    expect(game.snapshot.ball.attachedPaddle).toBe(0);
    game.movePointer(0.7);
    expect(game.snapshot.ball.x).toBeCloseTo(112);
    game.setInput('fire', false);
    expect(game.snapshot.ball.attachedPaddle).toBeNull();
    expect(game.snapshot.ball.vy).toBeLessThan(0);
    expect(game.snapshot.teams[0]?.ballsRemaining).toBe(5);
  });

  it.each([2, 6, 10])('steers a flying ball with the controller in variation %i', (variation) => {
    // arrange
    const game = configured({ variation });
    game.placeBall(80, 100, 0, -72);
    // act
    game.movePointer(0.8);
    game.step(FRAME);
    // assert
    expect(game.snapshot.ball.vx).toBeGreaterThan(0);
    expect(Math.hypot(game.snapshot.ball.vx, game.snapshot.ball.vy)).toBeCloseTo(72);
  });

  it.each([4, 8, 12])(
    'reveals the otherwise hidden wall only after contact in variation %i',
    (variation) => {
      // arrange
      const game = configured({ variation });
      expect(game.snapshot.wallVisible).toBe(false);
      // act
      hitBrick(game, 90);
      // assert
      expect(game.snapshot.wallVisible).toBe(true);
      game.placeBall(80, 100, 0, 0);
      game.step(250);
      game.step(250);
      expect(game.snapshot.wallVisible).toBe(false);
    },
  );

  it('reflects from a standard wall and penetrates it in Breakthru', () => {
    // arrange
    const normal = configured();
    const breakthrough = configured({ variation: 9 });
    // act
    hitBrick(normal, 90);
    hitBrick(breakthrough, 90);
    // assert
    expect(normal.snapshot.ball.vx).toBeLessThan(0);
    expect(breakthrough.snapshot.ball.vx).toBeGreaterThan(0);
    expect(normal.snapshot.teams[0]?.score).toBe(1);
    expect(breakthrough.snapshot.teams[0]?.score).toBe(1);
  });

  it.each([
    [0, 7],
    [18, 7],
    [36, 4],
    [54, 4],
    [72, 1],
    [90, 1],
  ])('awards original row points for brick %i', (id, points) => {
    // arrange
    const game = configured();
    // act
    hitBrick(game, id);
    // assert
    expect(game.snapshot.teams[0]?.score).toBe(points);
    expect(game.snapshot.bricks[id]?.alive).toBe(false);
  });

  it('increases speed on any of the top three rows', () => {
    // arrange
    const low = configured();
    const high = configured();
    // act
    hitBrick(low, 90);
    hitBrick(high, 36);
    // assert
    expect(Math.hypot(low.snapshot.ball.vx, low.snapshot.ball.vy)).toBeCloseTo(72);
    expect(Math.hypot(high.snapshot.ball.vx, high.snapshot.ball.vy)).toBeCloseTo(112);
  });

  it('cycles five-zone angles after hits three, seven and eleven and accelerates on twelve', () => {
    // arrange
    const game = configured();
    const angles: number[] = [];
    // act
    for (let hit = 0; hit < 12; hit++) {
      game.placeBall(89, 174, 0, 72);
      game.step(FRAME);
      const { vx, vy } = game.snapshot.ball;
      angles.push((Math.atan2(Math.abs(vy), Math.abs(vx)) * 180) / Math.PI);
    }
    // assert
    expect(angles[0]).toBeCloseTo(25);
    expect(angles[2]).toBeCloseTo(20);
    expect(angles[6]).toBeCloseTo(15);
    expect(angles[10]).toBeCloseTo(10);
    expect(angles[11]).toBeCloseTo(25);
    expect(Math.hypot(game.snapshot.ball.vx, game.snapshot.ball.vy)).toBeCloseTo(112);
  });

  it('keeps separate walls and scores when opposing teams alternate', () => {
    // arrange
    const game = configured({ players: 2 });
    hitBrick(game, 90);
    // act
    loseBall(game);
    // assert
    expect(game.snapshot.currentTeamIndex).toBe(1);
    expect(game.snapshot.bricks[90]?.alive).toBe(true);
    expect(game.snapshot.teams.map((team) => team.score)).toEqual([1, 0]);
    loseBall(game);
    expect(game.snapshot.currentTeamIndex).toBe(0);
    expect(game.snapshot.bricks[90]?.alive).toBe(false);
  });

  it('reflects a missed ball at the lower safety edge without resetting its rally in God mode', () => {
    // arrange
    const game = configured();
    game.setGodMode(true);
    game.placeBall(20, 194, 18, 72);

    // act
    game.step(FRAME);

    // assert
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.teams[0]?.ballsRemaining).toBe(5);
    expect(game.snapshot.ball.x).toBeCloseTo(20.3);
    expect(game.snapshot.ball.y).toBeLessThanOrEqual(191);
    expect(game.snapshot.ball).toMatchObject({ vx: 18, vy: -72 });
    expect(game.snapshot.soundEvents.map((event) => event.kind)).toContain('wall');
  });

  it('finishes only after each team uses its five balls', () => {
    // arrange
    const game = configured({ players: 4 });
    // act
    for (let lost = 0; lost < 10; lost++) loseBall(game);
    // assert
    expect(game.snapshot.status).toBe('gameOver');
    expect(game.snapshot.teams.map((team) => team.ballsRemaining)).toEqual([0, 0]);
    expect(game.snapshot.winner).toBe('tie');
  });

  it('automatically restores the first wall and ends at exactly two walls and 864 points', () => {
    // arrange
    const game = configured();
    // act
    clearWall(game);
    // assert
    expect(game.snapshot.teams[0]?.score).toBe(432);
    expect(game.snapshot.teams[0]?.wallsCleared).toBe(1);
    expect(game.snapshot.bricks.every((brick) => brick.alive)).toBe(true);
    clearWall(game);
    expect(game.snapshot.teams[0]?.score).toBe(864);
    expect(game.snapshot.status).toBe('gameOver');
    expect(game.snapshot.winner).toBe(0);
  });

  it('continues the opponent after a perfect game and resolves a tie by fewer balls', () => {
    // arrange
    const game = configured({ players: 2 });
    loseBall(game);
    loseBall(game);
    loseBall(game);
    // act
    clearWall(game);
    clearWall(game);
    expect(game.snapshot.currentTeamIndex).toBe(0);
    clearWall(game);
    clearWall(game);
    // assert
    expect(game.snapshot.teams.map((team) => team.score)).toEqual([864, 864]);
    expect(game.snapshot.winner).toBe(1);
  });

  it('times caught-ball aiming, freezes pause and never launches on lost focus', () => {
    // arrange
    const game = configured({ variation: 7 });
    game.setInput('fire', true);
    game.placeBall(80, 174, 0, 72);
    game.step(FRAME);
    game.step(250);
    const before = game.snapshot.teams[0]?.elapsedSeconds;
    // act
    game.pause();
    game.step(250);
    game.releaseInputs();
    // assert
    expect(game.snapshot.teams[0]?.elapsedSeconds).toBe(before);
    expect(game.snapshot.ball.attachedPaddle).toBe(0);
    game.togglePause();
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.ball.attachedPaddle).toBe(0);
  });

  it('keeps timed play running beyond twenty minutes rather than treating it as a countdown', () => {
    // arrange
    const game = configured({ variation: 5 });
    game.placeBall(80, 100, 0, 0);
    // act
    for (let step = 0; step < 4801; step++) game.step(250);
    // assert
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.teams[0]?.elapsedSeconds).toBeGreaterThan(1200);
  });

  it('ignores paddle and catch-button presses while paused, including their later release', () => {
    // arrange
    const game = configured({ variation: 3 });
    game.setInput('fire', true);
    game.placeBall(80, 174, 0, 72);
    game.step(FRAME);
    game.pause();

    // act
    game.setInput('fire', true);
    game.setInput('right', true);
    game.togglePause();
    game.setInput('fire', false);
    game.step(250);

    // assert
    expect(game.snapshot.ball.attachedPaddle).toBe(0);
    expect(game.snapshot.ball.x).toBe(80);
    expect(game.snapshot.paddles[0]?.x).toBe(70);
  });
});
