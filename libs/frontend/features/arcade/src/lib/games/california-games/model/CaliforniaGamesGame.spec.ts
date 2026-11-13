// #region Imports

import { describe, expect, it } from 'vitest';
import { CaliforniaGamesGame } from './CaliforniaGamesGame';
import type { CaliforniaGamesInput } from './CaliforniaGamesInput';

// #endregion

const FRAME = 1000 / 60;

function frames(game: CaliforniaGamesGame, count: number): void {
  for (let frame = 0; frame < count; frame++) game.update(FRAME);
}

function press(game: CaliforniaGamesGame, input: CaliforniaGamesInput, player: 1 | 2 = 1): void {
  game.setInput(player, input, true);
  frames(game, 1);
  game.setInput(player, input, false);
}

function openMenu(game: CaliforniaGamesGame): void {
  frames(game, 150);
  press(game, 'a');
}

function startSelectedEvent(game: CaliforniaGamesGame): void {
  press(game, 'a');
  frames(game, 180);
}

describe('CaliforniaGamesGame', () => {
  it('runs the Epyx opening, title, event menu, and original event countdown', () => {
    // arrange
    const game = new CaliforniaGamesGame();

    // act
    frames(game, 150);
    const title = game.snapshot;
    press(game, 'a');
    const menu = game.snapshot;
    press(game, 'a');
    const countdown = game.snapshot;
    frames(game, 180);

    // assert
    expect(title).toMatchObject({ phase: 'title', music: 'title' });
    expect(menu).toMatchObject({ phase: 'menu', selectedEvent: 'bmx' });
    expect(countdown).toMatchObject({ phase: 'countdown', currentEvent: 'bmx', countdown: 3 });
    expect(game.snapshot).toMatchObject({ phase: 'playing', music: 'bmx' });
    expect(game.snapshot.eventState).toMatchObject({ kind: 'bmx', timer: 90 });
  });

  it('reconstructs BMX acceleration, steering, jumping, flips, finish bonus, and top three', () => {
    // arrange
    const game = new CaliforniaGamesGame();
    game.setGodMode(true);
    openMenu(game);
    startSelectedEvent(game);
    game.setInput(1, 'up', true);
    game.setInput(1, 'right', true);

    // act
    frames(game, 120);
    game.setInput(1, 'right', false);
    press(game, 'a');
    frames(game, 5);
    press(game, 'b');
    for (let frame = 0; frame < 1400 && game.snapshot.phase === 'playing'; frame++) frames(game, 1);

    // assert
    expect(game.snapshot.phase).toBe('event-over');
    expect(game.snapshot.latestResults).toHaveLength(1);
    expect(game.snapshot.latestResults[0]!.event).toBe('bmx');
    expect(game.snapshot.latestResults[0]!.score).toBeGreaterThan(0);
    expect(game.snapshot.newHighScorePlayers).toEqual([1]);
    expect(game.snapshot.highScores[0]!.entries[0]).toMatchObject({ player: 1 });
  });

  it('starts a surf ride with A, scores time on the wave, and counts wipeouts', () => {
    // arrange
    const game = new CaliforniaGamesGame();
    openMenu(game);
    press(game, 'down');
    startSelectedEvent(game);

    // act
    press(game, 'a');
    game.setInput(1, 'left', true);
    frames(game, 120);
    game.setInput(1, 'left', false);

    // assert
    expect(game.snapshot.eventState).toMatchObject({
      kind: 'surfing',
      surfers: [{ player: 1, wipeouts: 1 }],
    });
  });

  it('supports Half Pipe starts, rhythm pumps, kick turns, aerials, and hand plants', () => {
    // arrange
    const game = new CaliforniaGamesGame();
    game.setGodMode(true);
    openMenu(game);
    press(game, 'down');
    press(game, 'down');
    startSelectedEvent(game);

    // act
    press(game, 'a');
    press(game, 'option2');
    const scaleDemo = game.snapshot.eventState;
    game.setInput(1, 'up', true);
    for (let frame = 0; frame < 600; frame++) {
      const state = game.snapshot.eventState;
      if (state?.kind === 'half-pipe' && Math.abs(state.skaters[0]!.x - 80) > 55)
        game.setInput(1, 'a', true);
      else game.setInput(1, 'a', false);
      frames(game, 1);
    }

    // assert
    expect(game.snapshot.eventState).toMatchObject({ kind: 'half-pipe' });
    expect(scaleDemo?.kind === 'half-pipe' ? scaleDemo.cameraScale : 1).not.toBe(1);
    const state = game.snapshot.eventState;
    expect(state?.kind === 'half-pipe' ? state.skaters[0]!.score : 0).toBeGreaterThan(0);
  });

  it('implements Foot Bag kicks, combo scoring, turning, catching, and god-mode recovery', () => {
    // arrange
    const game = new CaliforniaGamesGame();
    game.setGodMode(true);
    openMenu(game);
    press(game, 'down');
    press(game, 'down');
    press(game, 'down');
    startSelectedEvent(game);

    // act
    game.setInput(1, 'left', true);
    press(game, 'a');
    const namedMove = game.snapshot.eventState;
    game.setInput(1, 'left', false);
    frames(game, 75);
    game.setInput(1, 'down', true);
    press(game, 'a');
    game.setInput(1, 'down', false);
    frames(game, 240);

    // assert
    expect(game.snapshot.eventState).toMatchObject({ kind: 'foot-bag' });
    const state = game.snapshot.eventState;
    const player = state?.kind === 'foot-bag' ? state.playersState[0] : undefined;
    expect(player?.score).toBeGreaterThan(0);
    expect(player?.combo).toBeGreaterThan(0);
    expect(player?.drops).toBe(0);
    expect(namedMove?.kind === 'foot-bag' ? namedMove.playersState[0]!.lastMove : null).toBe(
      'half-axle',
    );
  });

  it.each([
    { event: 'bmx', selections: 0, frames: 90 * 60 },
    { event: 'surfing', selections: 1, frames: 90 * 60 },
    { event: 'half-pipe', selections: 2, frames: 75 * 60 },
    { event: 'foot-bag', selections: 3, frames: 90 * 60 },
  ] as const)('ends $event on its original timer and records a result', (example) => {
    // arrange
    const game = new CaliforniaGamesGame();
    openMenu(game);
    for (let selection = 0; selection < example.selections; selection++) press(game, 'down');
    startSelectedEvent(game);

    // act
    frames(game, example.frames);

    // assert
    expect(game.snapshot.phase).toBe('event-over');
    expect(game.snapshot.latestResults).toEqual([
      expect.objectContaining({ event: example.event, player: 1 }),
    ]);
  });

  it('models local two-player controls and preserves separate scores', () => {
    // arrange
    const game = new CaliforniaGamesGame();
    game.startNewGame({ players: 2 });
    openMenu(game);
    press(game, 'down');
    startSelectedEvent(game);

    // act
    press(game, 'a', 1);
    press(game, 'a', 2);
    game.setInput(1, 'left', true);
    game.setInput(2, 'right', true);
    frames(game, 90);

    // assert
    expect(game.snapshot.players).toBe(2);
    expect(game.snapshot.eventState).toMatchObject({
      kind: 'surfing',
      surfers: [{ player: 1 }, { player: 2 }],
    });
  });

  it('freezes the exact state when paused and honors the original option-button chords', () => {
    // arrange
    const game = new CaliforniaGamesGame();
    openMenu(game);
    const beforePause = game.snapshot;

    // act
    game.pressPause();
    frames(game, 300);
    const paused = game.snapshot;
    game.pressPause();
    game.setInput(1, 'option2', true);
    game.pressPause();
    game.setInput(1, 'option2', false);
    press(game, 'down');

    // assert
    expect(paused).toMatchObject({ ...beforePause, status: 'paused' });
    expect(game.snapshot).toMatchObject({
      status: 'running',
      flipped: true,
      selectedEvent: 'foot-bag',
    });

    game.setInput(1, 'option1', true);
    game.pressPause();
    expect(game.snapshot).toMatchObject({ phase: 'title', currentEvent: null });
  });

  it('produces identical snapshots for identical fixed-step input', () => {
    // arrange
    const left = new CaliforniaGamesGame();
    const right = new CaliforniaGamesGame();
    openMenu(left);
    openMenu(right);
    startSelectedEvent(left);
    startSelectedEvent(right);

    // act
    left.setInput(1, 'up', true);
    right.setInput(1, 'up', true);
    frames(left, 240);
    frames(right, 240);

    // assert
    expect(left.snapshot).toEqual(right.snapshot);
  });
});
