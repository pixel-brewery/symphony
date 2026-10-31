// #region Imports

import { describe, expect, it } from 'vitest';
import { JungleHuntGame } from './JungleHuntGame';

// #endregion

function frames(game: JungleHuntGame, count: number): void {
  for (let frame = 0; frame < count; frame++) game.step(1000 / 60);
}

function crossForest(game: JungleHuntGame): void {
  for (let tick = 0; tick < 18000 && game.snapshot.stage === 'vines'; tick++) {
    const snapshot = game.snapshot;
    const current = snapshot.player.vine;
    const next = current === null ? undefined : snapshot.vines[current + 1];
    const jump = current !== null && (!next || snapshot.player.x - next.tipX < 38);
    game.setInput('fire', jump);
    game.step(1000 / 60);
    if (game.snapshot.status === 'gameOver') break;
  }
}

function crossRiver(game: JungleHuntGame): void {
  for (let tick = 0; tick < 4000 && game.snapshot.stage === 'river'; tick++) {
    game.setInput('left', true);
    game.setInput('up', true);
    game.step(1000 / 60);
  }
}

describe('JungleHuntGame', () => {
  it('starts the original single-player five-life, 500-second game at either skill', () => {
    // arrange
    const game = new JungleHuntGame();
    // act
    game.startNewGame({ skill: 2 });
    // assert
    expect(game.snapshot).toMatchObject({
      status: 'playing',
      stage: 'vines',
      lives: 5,
      timer: 500,
      level: 1,
      score: 0,
      options: { skill: 2 },
    });
    expect(game.snapshot.vines).toHaveLength(11);
    expect(game.snapshot.crocodiles).toHaveLength(14);
    expect(game.snapshot.guards).toHaveLength(2);
  });

  it('crosses all vines with timed fire-button jumps and awards the forest exit', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    // act
    crossForest(game);
    // assert
    expect({
      stage: game.snapshot.stage,
      lives: game.snapshot.lives,
      score: game.snapshot.score,
      vine: game.snapshot.player.vine,
      timer: game.snapshot.timer,
    }).toMatchObject({ stage: 'river' });
    expect(game.snapshot.lives).toBe(5);
    expect(game.snapshot.score).toBe(1500);
    expect(game.snapshot.timer).toBeGreaterThan(400);
  });

  it('allows the river to be completed by avoiding crocodiles and breathing at the surface', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    crossForest(game);
    // act
    crossRiver(game);
    // assert
    expect({
      stage: game.snapshot.stage,
      lives: game.snapshot.lives,
      x: game.snapshot.player.x,
      score: game.snapshot.score,
    }).toMatchObject({ stage: 'boulders' });
    expect(game.snapshot.lives).toBe(5);
    expect(game.snapshot.score).toBe(2000);
  });

  it('keeps a physically held joystick direction through a stage transition', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    crossForest(game);
    game.setInput('left', true);
    game.setInput('up', true);
    // act
    for (let tick = 0; tick < 4000 && game.snapshot.stage === 'river'; tick++) game.step(1000 / 60);
    frames(game, 1);
    // assert
    expect(game.snapshot.stage).toBe('boulders');
    expect(game.snapshot.player.x).toBeLessThan(132);
  });

  it.each([
    { mouth: 0, score: 100 },
    { mouth: 1, score: 200 },
    { mouth: 2, score: 0 },
  ])(
    'uses upward knife attacks and preserves fully-open jaw invulnerability: $mouth',
    ({ mouth, score }) => {
      // arrange
      const game = new JungleHuntGame();
      game.startNewGame();
      crossForest(game);
      game.setGodMode(true);
      for (let tick = 0; tick < 180; tick++) {
        const state = game.snapshot;
        game.setInput('left', state.player.x - state.crocodiles[0]!.x > 7);
        game.setInput('down', state.player.y < 106);
        game.step(1000 / 60);
      }
      game.releaseInputs();
      for (let tick = 0; tick < 180 && game.snapshot.crocodiles[0]!.mouth !== mouth; tick++)
        game.step(1000 / 60);
      const before = game.snapshot.score;
      // act
      game.setInput('fire', true);
      frames(game, 1);
      // assert
      expect(game.snapshot.crocodiles[0]!.alive).toBe(mouth === 2);
      expect(game.snapshot.score - before).toBe(score);
    },
  );

  it('drowns underwater, decrements a life and restarts the current section without resetting the timer', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    crossForest(game);
    const timer = game.snapshot.timer;
    game.setInput('right', true);
    game.setInput('down', true);
    // act
    frames(game, 1220);
    // assert
    expect(game.snapshot.lives).toBeLessThan(5);
    expect(game.snapshot.timer).toBeLessThan(timer);
    expect(game.snapshot.stage).toBe('river');
  });

  it('freezes controls and countdown across pause, including the death animation', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    game.setInput('fire', true);
    frames(game, 5);
    game.pause();
    const paused = game.snapshot;
    // act
    frames(game, 120);
    // assert
    expect(game.snapshot).toEqual(paused);
    game.togglePause();
    frames(game, 60);
    expect(game.snapshot.timer).toBeLessThan(paused.timer);
  });

  it('ends the whole game when the rescue timer expires even with lives remaining', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    // act
    frames(game, 30000);
    // assert
    expect(game.snapshot).toMatchObject({ status: 'gameOver', timer: 0, lives: 5 });
  });

  it('completes every stage, applies the rescue bonus, and begins a harder forest in god mode', () => {
    // arrange
    const game = new JungleHuntGame();
    game.setGodMode(true);
    game.startNewGame();
    crossForest(game);
    crossRiver(game);
    // act
    for (let tick = 0; tick < 6000 && game.snapshot.rescues === 0; tick++) {
      game.setInput('left', true);
      game.step(1000 / 60);
    }
    const rescued = game.snapshot;
    frames(game, 150);
    // assert
    expect(rescued).toMatchObject({ status: 'rescued', rescues: 1, lives: 6 });
    expect(rescued.score).toBeGreaterThanOrEqual(4000);
    expect(game.snapshot).toMatchObject({
      status: 'playing',
      stage: 'vines',
      level: 2,
      timer: 500,
    });
  });

  it('reaches the rescue using ordinary jumps and completes it without invulnerability', () => {
    // arrange
    const game = new JungleHuntGame();
    game.startNewGame();
    crossForest(game);
    crossRiver(game);
    const previousHeights = new Map<number, number>();
    let committed = -1;
    let jumpedGuard = -1;
    // act
    for (
      let tick = 0;
      tick < 15000 && game.snapshot.rescues === 0 && game.snapshot.status !== 'gameOver';
      tick++
    ) {
      const state = game.snapshot;
      game.setInput('left', true);
      game.setInput('up', true);
      if (state.stage === 'boulders') {
        game.setInput('up', false);
        const ahead = state.boulders
          .filter((rock) => !rock.passed && rock.x < state.player.x + 10)
          .sort((a, b) => b.x - a.x)[0];
        const gap = ahead ? state.player.x - ahead.x : 200;
        game.setInput('fire', !!ahead && ahead.radius === 4 && gap < 28 && state.player.y >= 145);
        game.setInput('down', false);
        if (
          ahead &&
          ahead.radius > 4 &&
          gap < 48 &&
          committed !== ahead.id &&
          state.player.y >= 145
        ) {
          const rising = ahead.y < (previousHeights.get(ahead.id) ?? ahead.y);
          if (rising && ahead.y > 142) committed = ahead.id;
          else {
            game.setInput('left', false);
            game.setInput('down', true);
          }
        }
        for (const rock of state.boulders) previousHeights.set(rock.id, rock.y);
      } else if (state.stage === 'rescue') {
        const ahead = state.guards
          .filter((guard) => !guard.passed && guard.x < state.player.x)
          .sort((a, b) => b.x - a.x)[0];
        const jumping = !!ahead && state.player.x - ahead.x < 31 && state.player.y >= 145;
        game.setInput('fire', jumping);
        if (jumping && ahead) jumpedGuard = ahead.id;
        if (
          ahead &&
          ahead.id !== jumpedGuard &&
          state.player.x - ahead.x < 32 &&
          state.player.y < 145
        )
          game.setInput('left', false);
      }
      game.step(1000 / 60);
      if (game.snapshot.lives < state.lives) committed = -1;
    }
    // assert
    expect({
      stage: game.snapshot.stage,
      status: game.snapshot.status,
      lives: game.snapshot.lives,
      score: game.snapshot.score,
      progress: game.snapshot.progress,
    }).toMatchObject({ status: 'rescued' });
    expect(game.snapshot.rescues).toBe(1);
  });

  it('discards held controls and old scores on reset while preserving god mode', () => {
    // arrange
    const game = new JungleHuntGame();
    game.setGodMode(true);
    game.startNewGame();
    crossForest(game);
    game.setInput('left', true);
    // act
    game.startNewGame({ skill: 2 });
    frames(game, 30);
    // assert
    expect(game.snapshot).toMatchObject({
      score: 0,
      lives: 5,
      stage: 'vines',
      level: 1,
      godMode: true,
      options: { skill: 2 },
    });
    expect(game.snapshot.player.vine).toBe(0);
  });
});
