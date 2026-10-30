// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArcadeGodModeStore } from '../../../god-mode/ArcadeGodModeStore';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import type { IArcadeCanvasOptions } from '../../shared/browser/IArcadeCanvasOptions';
import type { IRiverRaidSnapshot } from '../model/IRiverRaidSnapshot';
import { RiverRaidGame } from '../model/RiverRaidGame';
import type { RiverRaidInput } from '../model/RiverRaidInput';
import { RiverRaidView } from './RiverRaidView';

const browser = vi.hoisted(() => ({
  options: undefined as IArcadeCanvasOptions<RiverRaidInput> | undefined,
  controller: { dispose: vi.fn(), releaseInputs: vi.fn(), focus: vi.fn() },
  audio: {
    reset: vi.fn(),
    dispose: vi.fn(),
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(),
    setMuted: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@angular/core', async () => {
  const angular = await vi.importActual<typeof import('@angular/core')>('@angular/core');
  return {
    ...angular,
    viewChild: () => angular.signal({ nativeElement: document.createElement('canvas') }),
  };
});

vi.mock('@symphony/frontend-core', () => {
  class CommandStub<TParameter = void> {
    private readonly _execute: (parameter: TParameter) => void;
    private readonly _canExecute: () => boolean;

    public constructor(execute: (parameter: TParameter) => void, canExecute = () => true) {
      this._execute = execute;
      this._canExecute = canExecute;
    }

    public execute(parameter?: TParameter): void {
      if (this._canExecute()) this._execute(parameter as TParameter);
    }
  }
  return { Command: CommandStub, CommandDirective: class CommandDirectiveStub {} };
});

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  class ControlStub {}
  return {
    ButtonComponent: ControlStub,
    CardActionsComponent: ControlStub,
    CardComponent: ControlStub,
    CardContentComponent: ControlStub,
    CardHeaderComponent: ControlStub,
    IconNameDirective: ControlStub,
    KbdComponent: ControlStub,
    PageComponent: ControlStub,
    PageContentComponent: ControlStub,
    PageHeaderComponent: ControlStub,
    TextComponent: ControlStub,
    TypographyDirective: ControlStub,
    KBD_DEFAULT_PROPS: new InjectionToken('KBD_DEFAULT_PROPS'),
  };
});

vi.mock('../../../god-mode/ArcadeGodModeStore', () => ({
  ArcadeGodModeStore: class ArcadeGodModeStore {},
}));

vi.mock('../../../leaderboard/ArcadeLeaderboardStore', () => ({
  ArcadeLeaderboardStore: class ArcadeLeaderboardStore {},
}));

vi.mock('../../shared/browser/ArcadeCanvasController', () => ({
  ArcadeCanvasController: class ArcadeCanvasControllerStub {
    public readonly dispose = browser.controller.dispose;
    public readonly releaseInputs = browser.controller.releaseInputs;
    public readonly focus = browser.controller.focus;

    public constructor(options: IArcadeCanvasOptions<RiverRaidInput>) {
      browser.options = options;
    }
  },
}));

vi.mock('../audio/RiverRaidAudio', () => ({
  RiverRaidAudio: class RiverRaidAudioStub {
    public readonly reset = browser.audio.reset;
    public readonly dispose = browser.audio.dispose;
    public readonly resume = browser.audio.resume;
    public readonly suspend = browser.audio.suspend;
    public readonly setMuted = browser.audio.setMuted;
    public readonly update = browser.audio.update;
  },
}));

vi.mock('../rendering/RiverRaidRenderer', () => ({
  RiverRaidRenderer: class RiverRaidRendererStub {
    public readonly draw = vi.fn();
  },
}));

// #endregion

function createView() {
  const add = vi.fn(() => true);
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: ArcadeGodModeStore, useValue: { enabled: signal(false) } },
      { provide: ArcadeLeaderboardStore, useValue: { add } },
    ],
  });
  const view = TestBed.runInInjectionContext(() => new RiverRaidView(TestBed.inject(Router)));
  TestBed.tick();
  return { view, add };
}

describe('RiverRaidView', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  beforeEach(() => {
    vi.clearAllMocks();
    browser.options = undefined;
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('preserves the current flight through title and instructions and resumes it', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'up', active: true });
    view.advanceFrameCommand.execute(150);
    const before = view.snapshot;

    // act
    view.menuCommand.execute();
    view.instructionsCommand.execute();
    view.advanceFrameCommand.execute(250);
    view.inputCommand.execute({ input: 'left', active: true });

    // assert
    expect(view.snapshot).toMatchObject({
      status: 'paused',
      fuel: before.fuel,
      bottom: before.bottom,
      x: before.x,
      score: before.score,
    });
    expect(view.canContinue()).toBe(true);

    // act
    view.resumeCommand.execute();

    // assert
    expect(view.status()).toBe('playing');
    expect(view.screen()).toBe('game');
  });

  it('applies selected console switches only to a new game and resets player state', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    view.playersCommand.execute(2);
    view.difficultyCommand.execute(0);

    // assert
    expect(view.snapshot.options).toEqual({ players: 1, difficulty: ['b', 'b'] });

    // act
    view.newGameCommand.execute();

    // assert
    expect(view.snapshot.options).toEqual({ players: 2, difficulty: ['a', 'b'] });
    expect(view.snapshot).toMatchObject({
      status: 'ready',
      player: 1,
      score: 0,
      reserves: 3,
      fuel: 1,
    });
  });

  it('records each finalized pilot exactly once even while the other pilot is still playing', () => {
    // arrange
    const { view, add } = createView();
    view.playersCommand.execute(2);
    view.newGameCommand.execute();
    const completed: IRiverRaidSnapshot = {
      ...view.snapshot,
      status: 'playing',
      results: [{ player: 1, score: 15980, level: 7, elapsedSeconds: 430, outcome: 'lost' }],
    };
    const snapshot = vi
      .spyOn(RiverRaidGame.prototype, 'snapshot', 'get')
      .mockReturnValue(completed);

    // act
    view.advanceFrameCommand.execute(16);
    view.menuCommand.execute();
    view.resumeCommand.execute();
    view.advanceFrameCommand.execute(16);

    // assert
    expect(add).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledWith({
      ...completed.results[0],
      game: 'river-raid',
      id: expect.any(String),
      completedAt: expect.any(String),
    });

    // act
    snapshot.mockReturnValue({
      ...completed,
      status: 'ended',
      results: [
        ...completed.results,
        { player: 2, score: 300, level: 2, elapsedSeconds: 94, outcome: 'lost' },
      ],
    });
    view.advanceFrameCommand.execute(16);
    view.advanceFrameCommand.execute(16);

    // assert
    expect(add).toHaveBeenCalledTimes(2);
    expect(view.canContinue()).toBe(false);
  });

  it('suspends sound and held controls in menus and disposes all browser resources', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    TestBed.tick();
    view.enableAudio();
    view.toggleSoundCommand.execute();
    TestBed.tick();

    // assert
    expect(browser.options).toBeDefined();
    expect(browser.audio.resume).toHaveBeenCalledOnce();
    expect(browser.audio.setMuted).toHaveBeenLastCalledWith(true);

    // act
    view.menuCommand.execute();
    TestBed.tick();

    // assert
    expect(browser.audio.suspend).toHaveBeenCalled();
    expect(browser.controller.releaseInputs).toHaveBeenCalled();

    // act
    TestBed.resetTestingModule();

    // assert
    expect(browser.audio.dispose).toHaveBeenCalledOnce();
    expect(browser.controller.dispose).toHaveBeenCalledOnce();
  });
});
