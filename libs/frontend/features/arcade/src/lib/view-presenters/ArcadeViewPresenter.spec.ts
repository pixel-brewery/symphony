// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ArcadeLeaderboardStore } from '../leaderboard/ArcadeLeaderboardStore';
import { ArcadeGameIds } from '../games/ArcadeGameIds';
import { ArcadeViewPresenter } from './ArcadeViewPresenter';

// #endregion

describe('ArcadeViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  function arrange() {
    const navigate = vi.fn<(commands: readonly string[]) => Promise<boolean>>(async () => true);
    const show = vi.fn();
    const presenter = TestBed.runInInjectionContext(
      () =>
        new ArcadeViewPresenter(
          { navigate } as unknown as Router,
          { entries: signal([]) } as unknown as ArcadeLeaderboardStore,
          { show } as unknown as DialogService,
        ),
    );
    return { presenter, navigate, show };
  }

  it('lists the eight shipped games in catalog order with their covers and player counts', () => {
    // arrange
    const { presenter } = arrange();

    // act
    const games = presenter.games.map((game) => [
      game.id,
      game.title,
      game.cover,
      game.minPlayers,
      game.maxPlayers,
    ]);

    // assert
    expect(games).toEqual([
      ['pong', 'Pong', 'arcade/pong.webp', 2, 2],
      ['breakout', 'Breakout', 'arcade/breakout.webp', 1, 4],
      ['pitfall', 'Pitfall!', 'arcade/pitfall.webp', 1, 1],
      ['pitfall-ii', 'Pitfall II', 'arcade/pitfall-ii.webp', 1, 1],
      ['river-raid', 'River Raid', 'arcade/river-raid.webp', 1, 2],
      ['seaquest', 'Seaquest', 'arcade/seaquest.webp', 1, 2],
      ['jungle-hunt', 'Jungle Hunt', 'arcade/jungle-hunt.webp', 1, 1],
      ['realsports-boxing', 'RealSports Boxing', 'arcade/realsports-boxing.webp', 1, 2],
    ]);
    expect(presenter.games.map((game) => game.id)).toEqual([...ArcadeGameIds]);
    expect(presenter.games.find((game) => game.id === 'pitfall-ii')?.fullTitle).toBe(
      'Pitfall II: Lost Caverns',
    );
  });

  it('opens each game on its unchanged route and the leaderboard as a dialog', () => {
    // arrange
    const { presenter, navigate, show } = arrange();

    // act
    for (const game of presenter.games) game.play.execute();
    presenter.showLeaderboardCommand.execute();

    // assert
    expect(navigate.mock.calls.map(([commands]) => commands)).toEqual(
      presenter.games.map((game) => [`/main/arcade/${game.id}`]),
    );
    expect(show).toHaveBeenCalledTimes(1);
  });
});
