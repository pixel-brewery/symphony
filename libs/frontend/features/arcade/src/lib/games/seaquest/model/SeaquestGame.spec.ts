// #region Imports

import { describe, expect, it } from 'vitest';
import { SeaquestGame } from './SeaquestGame';
import type { ISeaquestSnapshot } from './ISeaquestSnapshot';

// #endregion

interface IGameFixture {
  _oxygen: number;
  _frame: number;
  _x: number;
  _y: number;
  _status: ISeaquestSnapshot['status'];
  _patrolX: number;
  _players: {
    score: number;
    level: number;
    difficulty: number;
    divers: number;
    reserves: number;
    elapsedFrames: number;
    outcome: 'lost' | 'completed' | null;
  }[];
  _rows: {
    x: number;
    direction: -1 | 1;
    kind: 'shark' | 'sub';
    mask: number;
    diver: number | null;
    diverState: 'available' | 'swimming' | 'rescued';
    torpedo: number | null;
    caughtDiver: boolean;
  }[];
}

function fixture(game: SeaquestGame): IGameFixture {
  return game as unknown as IGameFixture;
}
function frames(game: SeaquestGame, count: number): void {
  for (let frame = 0; frame < count; frame++) game.step(1000 / 60);
}
function quietDive(game: SeaquestGame): IGameFixture {
  const state = fixture(game);
  state._rows.forEach((row) => {
    row.mask = 0;
    row.diver = null;
    row.diverState = 'available';
    row.torpedo = null;
  });
  game.setInput('down', true);
  frames(game, 25);
  game.releaseInputs();
  return state;
}

describe('SeaquestGame', () => {
  it('waits for a dive, moves one pixel per NTSC frame and enforces cartridge boundaries', () => {
    // arrange
    const game = new SeaquestGame();
    game.setGodMode(true);
    frames(game, 120);
    const waiting = game.snapshot;

    // act
    game.setInput('down', true);
    game.setInput('right', true);
    frames(game, 200);

    // assert
    expect(waiting).toMatchObject({ status: 'ready', oxygen: 64, reserves: 3, frame: 0 });
    expect(game.snapshot.player).toMatchObject({ x: 134, y: 108, facing: 1 });
    expect(game.snapshot.oxygen).toBe(58);
  });

  it('keeps one torpedo in flight, follows depth and applies independent A and B speeds', () => {
    // arrange
    const fast = new SeaquestGame();
    const slow = new SeaquestGame();
    slow.newGame({ players: 1, difficultyA: 'A', difficultyB: 'B' });
    quietDive(fast);
    quietDive(slow);

    // act
    for (const game of [fast, slow]) {
      game.setInput('fire', true);
      game.setInput('down', true);
      frames(game, 3);
    }

    // assert
    expect(fast.snapshot.torpedo).toMatchObject({ x: 99, y: fast.snapshot.player.y + 8 });
    expect(slow.snapshot.torpedo).toMatchObject({ x: 93, y: slow.snapshot.player.y + 8 });
    expect(fast.snapshot.soundEvents.filter((event) => event.kind === 'shoot')).toHaveLength(1);
    expect(fast.snapshot.soundEvents.find((event) => event.kind === 'shoot')?.value).toBe(64);
  });

  it('picks up real diver pixels and caps the hold at six', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    state._y = 32;
    const row = state._rows[0]!;
    row.diverState = 'swimming';
    row.diver = state._x + 5;

    // act
    frames(game, 1);
    const first = game.snapshot;
    state._players[0]!.divers = 5;
    row.diverState = 'swimming';
    row.diver = state._x + 5;
    frames(game, 1);
    row.diverState = 'swimming';
    row.diver = state._x + 5;
    frames(game, 1);

    // assert
    expect(first.divers).toBe(1);
    expect(first.rows[0]!.diver).toBeNull();
    expect(game.snapshot.divers).toBe(6);
    expect(game.snapshot.soundEvents.some((event) => event.kind === 'full')).toBe(true);
    expect(game.snapshot.score).toBe(0);
  });

  it('cashes remaining oxygen before six individual diver awards and unlocks the next round', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    state._oxygen = 40;
    state._y = 13;
    state._players[0]!.divers = 6;

    // act
    frames(game, 1);
    const surfacing = game.snapshot;
    frames(game, 350);

    // assert
    expect(surfacing.status).toBe('oxygen-bonus');
    expect(game.snapshot).toMatchObject({
      score: 1100,
      level: 2,
      difficulty: 1,
      divers: 0,
      oxygen: 64,
      status: 'ready',
    });
    expect(game.snapshot.soundEvents.filter((event) => event.kind === 'surface')).toHaveLength(6);
  });

  it('early surfacing costs one diver, raises speed and locks movement until refill ends', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    state._oxygen = 20;
    state._y = 13;
    state._players[0]!.divers = 5;

    // act
    frames(game, 1);
    game.setInput('right', true);
    frames(game, 88);

    // assert
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      oxygen: 64,
      divers: 4,
      level: 1,
      difficulty: 1,
      score: 0,
    });
    expect(game.snapshot.player.x).toBe(76);
  });

  it('empty surfacing destroys a submarine and restarts with one fewer reserve', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    state._oxygen = 50;
    state._y = 13;

    // act
    frames(game, 1);
    const collision = game.snapshot;
    frames(game, 230);

    // assert
    expect(collision.status).toBe('dying');
    expect(game.snapshot).toMatchObject({ status: 'ready', reserves: 2, oxygen: 64, divers: 0 });
  });

  it('oxygen exhaustion loses one diver and alternates players with independent progress', () => {
    // arrange
    const game = new SeaquestGame();
    game.newGame({ players: 2, difficultyA: 'B', difficultyB: 'A' });
    const state = quietDive(game);
    state._players[0]!.divers = 4;
    state._players[0]!.score = 600;
    state._oxygen = 1;
    state._frame = 31;

    // act
    frames(game, 1);
    const empty = game.snapshot;
    frames(game, 230);

    // assert
    expect(empty.status).toBe('dying');
    expect(game.snapshot).toMatchObject({
      currentPlayer: 2,
      reserves: 3,
      score: 0,
      divers: 0,
      status: 'ready',
    });
    expect(game.snapshot.players[0]).toMatchObject({
      score: 600,
      reserves: 2,
      divers: 3,
      outcome: null,
    });
  });

  it('the patrol can kill during refill after the second full rescue', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    state._players[0]!.level = 2;
    state._players[0]!.divers = 2;
    state._y = 13;
    state._oxygen = 10;
    frames(game, 1);
    state._patrolX = state._x + 4;

    // act
    frames(game, 1);

    // assert
    expect(game.snapshot.status).toBe('dying');
    expect(game.snapshot.soundEvents.at(-1)?.kind).toBe('death');
  });

  it('earns a reserve at 10,000, caps reserves at six and freezes at 999,999', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    state._players[0]!.score = 9990;
    state._players[0]!.divers = 6;
    state._oxygen = 20;
    state._y = 13;

    // act
    frames(game, 3);
    const extra = game.snapshot;
    state._players[0]!.reserves = 6;
    state._players[0]!.score = 999990;
    frames(game, 3);
    const finished = game.snapshot;
    frames(game, 60);

    // assert
    expect(extra.reserves).toBe(4);
    expect(finished).toMatchObject({ score: 999999, reserves: 6, status: 'completed' });
    expect(finished.players[0]!.outcome).toBe('completed');
    expect(game.snapshot).toEqual(finished);
  });

  it('finalizes each exhausted player and allows the surviving player to continue', () => {
    // arrange
    const game = new SeaquestGame();
    game.newGame({ players: 2, difficultyA: 'B', difficultyB: 'B' });
    const state = quietDive(game);
    state._players[0]!.reserves = 0;
    state._y = 13;
    state._oxygen = 20;

    // act
    frames(game, 230);
    const firstLost = game.snapshot;
    state._status = 'playing';
    state._players[1]!.reserves = 0;
    state._oxygen = 20;
    frames(game, 95);

    // assert
    expect(firstLost.players[0]!.outcome).toBe('lost');
    expect(firstLost.currentPlayer).toBe(2);
    expect(game.snapshot.status).toBe('gameOver');
    expect(game.snapshot.players.every((player) => player.outcome === 'lost')).toBe(true);
  });

  it('pauses rewards and clears controls without changing the preserved frame', () => {
    // arrange
    const game = new SeaquestGame();
    quietDive(game);
    game.setInput('right', true);
    game.pause();
    const paused = game.snapshot;

    // act
    frames(game, 100);
    const stillPaused = game.snapshot;
    game.togglePause();
    frames(game, 1);

    // assert
    expect(stillPaused).toEqual(paused);
    expect(game.snapshot.player.x).toBe(paused.player.x);
    expect(game.snapshot.frame).toBe(paused.frame + 1);
  });

  it('God mode prevents all fatal causes while keeping ordinary rescue progression', () => {
    // arrange
    const game = new SeaquestGame();
    const state = quietDive(game);
    game.setGodMode(true);
    state._oxygen = 1;
    state._frame = 31;

    // act
    frames(game, 1);
    state._y = 13;
    frames(game, 1);

    // assert
    expect(game.snapshot.status).toBe('refilling');
    expect(game.snapshot.reserves).toBe(3);
    expect(game.snapshot.players[0]!.outcome).toBeNull();
  });
  it('rescues a full batch through generated lanes using only public joystick controls', () => {
    // arrange
    const game = new SeaquestGame();
    game.setGodMode(true);
    let ticks = 0;

    // act
    while (game.snapshot.level === 1 && ticks++ < 12000) {
      const state = game.snapshot;
      game.releaseInputs();
      if (state.status === 'ready') game.setInput('down', true);
      else if (state.status === 'playing') {
        if (state.divers === 6) game.setInput('up', true);
        else {
          const target = state.rows
            .filter((row) => row.diver !== null && row.kind === 'shark')
            .sort((a, b) => Math.abs(a.y - state.player.y) - Math.abs(b.y - state.player.y))[0];
          if (target && target.diver !== null) {
            const x = Math.max(21, Math.min(134, target.diver - 4));
            if (Math.abs(x - state.player.x) > 1)
              game.setInput(x < state.player.x ? 'left' : 'right', true);
            if (state.player.y !== target.y)
              game.setInput(state.player.y < target.y ? 'down' : 'up', true);
          } else game.setInput('fire', true);
        }
      }
      frames(game, 1);
    }

    // assert
    expect(game.snapshot.level).toBe(2);
    expect(game.snapshot.score).toBeGreaterThanOrEqual(300);
    expect(game.snapshot.divers).toBe(0);
    expect(game.snapshot.reserves).toBe(3);
  });
  it('a maximum-score oxygen reward preserves the unfinished opponent refill stage', () => {
    // arrange
    const game = new SeaquestGame();
    game.newGame({ players: 2, difficultyA: 'B', difficultyB: 'B' });
    const state = quietDive(game);
    state._players[0]!.score = 999990;
    state._players[0]!.divers = 6;
    state._oxygen = 40;
    state._y = 13;

    // act
    frames(game, 3);
    const handoff = game.snapshot;
    frames(game, 130);

    // assert
    expect(handoff).toMatchObject({ currentPlayer: 2, status: 'refilling', score: 0 });
    expect(handoff.players[0]).toMatchObject({ score: 999999, outcome: 'completed' });
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      oxygen: 64,
      currentPlayer: 2,
      score: 0,
    });
  });
});
