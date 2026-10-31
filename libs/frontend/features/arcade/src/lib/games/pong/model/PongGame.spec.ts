// #region Imports

import { describe, expect, it } from 'vitest';
import { PongGame } from './PongGame';
import { PongRules } from './PongRules';

// #endregion

const FRAME_MS = (1000 * PongRules.lineClocks * PongRules.frameLines) / PongRules.clock;
function frames(game: PongGame, count: number): void {
  for (let i = 0; i < count; i++) game.step(FRAME_MS);
}
function missBoth(game: PongGame): void {
  const away = game.snapshot.ball.y < 123 ? 1 : 0;
  game.movePointer(0.2, away);
  game.movePointer(0.8, away);
  game.step(FRAME_MS);
}

describe('PongGame', () => {
  it('runs the original silent demonstration without scoring or requiring a player', () => {
    // arrange
    const game = new PongGame();
    const initial = game.snapshot;
    // act
    frames(game, 1800);
    // assert
    expect(game.snapshot.status).toBe('attract');
    expect(game.snapshot.scores).toEqual([0, 0]);
    expect(game.snapshot.ball).not.toEqual(initial.ball);
    expect(game.snapshot.ball.x).toBeGreaterThanOrEqual(0);
    expect(game.snapshot.ball.x).toBeLessThanOrEqual(370);
    expect(game.snapshot.soundEvents).toEqual([]);
    expect(game.snapshot.elapsedSeconds).toBe(0);
  });

  it('serves automatically after the original timer while the hidden vertical counter keeps moving', () => {
    // arrange
    const game = new PongGame();
    game.newGame(15);
    const initial = game.snapshot;
    // act
    frames(game, initial.serveFrames - 1);
    // assert
    expect(game.snapshot.status).toBe('serving');
    expect(game.snapshot.ball.visible).toBe(false);
    expect(game.snapshot.ball.x).toBe(181);
    expect(game.snapshot.ball.y).not.toBe(initial.ball.y);
    expect(game.snapshot.soundEvents).toEqual([]);
    expect(game.snapshot.targetScore).toBe(15);
    // act
    frames(game, 1);
    // assert
    expect(game.snapshot.status).toBe('playing');
    expect(game.snapshot.ball.visible).toBe(true);
    expect(Math.abs(game.snapshot.ball.vx)).toBe(1);
    expect((initial.serveFrames * FRAME_MS) / 1000).toBeGreaterThanOrEqual(1.7061);
  });

  it('allows two humans to move independently and preserves the cabinet top gap', () => {
    // arrange
    const game = new PongGame();
    game.newGame();
    game.setInput('leftUp', true);
    game.setInput('rightDown', true);
    // act
    frames(game, 10);
    // assert
    expect(game.snapshot.paddles).toEqual([75, 155]);
    // act
    frames(game, 100);
    game.releaseInputs();
    game.movePointer(0.2, 0);
    game.movePointer(0.8, 1);
    // assert
    expect(game.snapshot.paddles).toEqual([8, 231]);
  });

  it('accelerates only at four and twelve returns and caps the hit counter', () => {
    // arrange
    const game = new PongGame();
    game.newGame();
    const speeds = new Map<number, number>();
    // act
    for (let i = 0; i < 4500 && speeds.size < 13; i++) {
      const y = (game.snapshot.ball.y + 1.5) / PongRules.height;
      game.movePointer(0.2, y);
      game.movePointer(0.8, y);
      game.step(FRAME_MS);
      speeds.set(game.snapshot.rallyHits, Math.abs(game.snapshot.ball.vx));
    }
    // assert
    expect(speeds.get(0)).toBe(1);
    expect(speeds.get(3)).toBe(1);
    expect(speeds.get(4)).toBe(2);
    expect(speeds.get(11)).toBe(2);
    expect(speeds.get(12)).toBe(3);
    expect(game.snapshot.scores).toEqual([0, 0]);
  });

  it('scores a miss once, resets horizontal speed and serves toward the player who missed', () => {
    // arrange
    const game = new PongGame();
    game.newGame();
    // act
    for (let i = 0; i < 1000 && game.snapshot.scores[0] === 0; i++) missBoth(game);
    const scored = game.snapshot;
    frames(game, 20);
    // assert
    expect(scored.scores).toEqual([1, 0]);
    expect(scored.status).toBe('serving');
    expect(scored.rallyHits).toBe(0);
    expect(scored.ball.vx).toBe(1);
    expect(scored.soundEvents.map((event) => event.kind)).toContain('score');
    expect(game.snapshot.scores).toEqual([1, 0]);
  });

  it.each([11, 15] as const)(
    'ends immediately at %s and preserves the result during subsequent attract animation',
    (target) => {
      // arrange
      const game = new PongGame();
      game.newGame(target);
      // act
      for (let i = 0; i < 20000 && game.snapshot.winner === null; i++) missBoth(game);
      const completed = game.snapshot;
      frames(game, 500);
      // assert
      expect(completed.winner).toBe(0);
      expect(completed.status).toBe('gameOver');
      expect(completed.scores).toEqual([target, 0]);
      expect(game.snapshot.scores).toEqual(completed.scores);
      expect(game.snapshot.elapsedSeconds).toBe(completed.elapsedSeconds);
      expect(game.snapshot.soundEvents).toEqual([]);
    },
  );

  it('awards the right player when the serve retained from attract travels left', () => {
    // arrange
    const game = new PongGame();
    frames(game, 200);
    game.newGame();
    // act
    for (let i = 0; i < 1000 && game.snapshot.scores[1] === 0; i++) missBoth(game);
    // assert
    expect(game.snapshot.scores).toEqual([0, 1]);
    expect(game.snapshot.ball.vx).toBe(-1);
  });

  it('freezes serve phase, elapsed time and held keys across pause and resets a new coin cleanly', () => {
    // arrange
    const game = new PongGame();
    game.newGame();
    game.setInput('leftUp', true);
    frames(game, 10);
    game.pause();
    const paused = game.snapshot;
    // act
    frames(game, 120);
    game.movePointer(0.2, 1);
    game.togglePause();
    frames(game, 1);
    // assert
    expect(game.snapshot.paddles).toEqual(paused.paddles);
    expect(game.snapshot.frame).toBe(paused.frame + 1);
    expect(game.snapshot.serveFrames).toBe(paused.serveFrames - 1);
    // act
    game.newGame(15);
    // assert
    expect(game.snapshot.scores).toEqual([0, 0]);
    expect(game.snapshot.elapsedSeconds).toBe(0);
    expect(game.snapshot.generation).toBe(2);
    expect(game.snapshot.targetScore).toBe(15);
  });

  it('retains fractional fields and rejects invalid host input without corrupting the court', () => {
    // arrange
    const game = new PongGame();
    game.newGame();
    // act
    game.step(FRAME_MS / 2);
    game.step(FRAME_MS / 2);
    const state = game.snapshot;
    game.step(NaN);
    game.step(-100);
    game.movePointer(Infinity, NaN);
    // assert
    expect(state.frame).toBe(1);
    expect(game.snapshot).toEqual(state);
    // act
    game.step(60_000);
    // assert
    expect(game.snapshot.frame - state.frame).toBeLessThanOrEqual(16);
  });
});
