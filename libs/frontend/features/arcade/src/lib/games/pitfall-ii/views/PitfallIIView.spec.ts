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
import type { IPitfallIISnapshot } from '../model/IPitfallIISnapshot';
import { PitfallIIGame } from '../model/PitfallIIGame';
import type { PitfallIIInput } from '../model/PitfallIIInput';
import { PitfallIIView } from './PitfallIIView';

const browser = vi.hoisted(() => ({
  options: undefined as IArcadeCanvasOptions<PitfallIIInput> | undefined,
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

    public constructor(options: IArcadeCanvasOptions<PitfallIIInput>) {
      browser.options = options;
    }
  },
}));

vi.mock('../audio/PitfallIIAudio', () => ({
  PitfallIIAudio: class PitfallIIAudioStub {
    public readonly reset = browser.audio.reset;
    public readonly dispose = browser.audio.dispose;
    public readonly resume = browser.audio.resume;
    public readonly suspend = browser.audio.suspend;
    public readonly setMuted = browser.audio.setMuted;
    public readonly update = browser.audio.update;
  },
}));

vi.mock('../rendering/PitfallIIRenderer', () => ({
  PitfallIIRenderer: class PitfallIIRendererStub {
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
  const view = TestBed.runInInjectionContext(() => new PitfallIIView(TestBed.inject(Router)));
  TestBed.tick();
  return { view, add };
}

describe('PitfallIIView', () => {
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

  it('pauses menus and continues the same expedition without advancing its player or score', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'right', active: true });
    view.advanceFrameCommand.execute(150);
    view.inputCommand.execute({ input: 'right', active: false });
    const beforeMenu = view.snapshot;

    // act
    view.menuCommand.execute();
    view.instructionsCommand.execute();
    view.advanceFrameCommand.execute(1000);
    view.inputCommand.execute({ input: 'left', active: true });

    // assert
    expect(view.screen()).toBe('instructions');
    expect(view.status()).toBe('paused');
    expect(view.canContinue()).toBe(true);
    expect(view.snapshot).toMatchObject({
      player: beforeMenu.player,
      elapsed: beforeMenu.elapsed,
      totalFrames: beforeMenu.totalFrames,
      score: beforeMenu.score,
      goldCollected: beforeMenu.goldCollected,
      objectives: beforeMenu.objectives,
    });

    // act
    view.resumeCommand.execute();

    // assert
    expect(view.screen()).toBe('game');
    expect(view.status()).toBe('playing');
    expect(view.snapshot.player).toEqual(beforeMenu.player);
    expect(view.snapshot.totalFrames).toBe(beforeMenu.totalFrames);
  });

  it('starts a fresh expedition from the menu and waits for joystick input again', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    const initial = view.snapshot;
    view.inputCommand.execute({ input: 'right', active: true });
    view.advanceFrameCommand.execute(200);
    view.menuCommand.execute();

    // act
    view.newGameCommand.execute();

    // assert
    expect(view.screen()).toBe('game');
    expect(view.status()).toBe('ready');
    expect(view.snapshot).toMatchObject({
      score: initial.score,
      elapsed: 0,
      totalFrames: 0,
      goldCollected: 0,
      player: initial.player,
      objectives: initial.objectives,
    });
    expect(view.hasExpedition()).toBe(true);
  });

  it('records each completed expedition once with its full score, gold and elapsed time', () => {
    // arrange
    const { view, add } = createView();
    view.newGameCommand.execute();
    const completed: IPitfallIISnapshot = {
      ...view.snapshot,
      status: 'won',
      score: 189000,
      goldCollected: 26,
      elapsed: 1450,
      objectives: { rhonda: true, quickclaw: true, diamond: true, rat: true },
    };
    const snapshot = vi.spyOn(PitfallIIGame.prototype, 'snapshot', 'get');
    snapshot.mockReturnValue(completed);

    // act
    view.advanceFrameCommand.execute(16);
    view.advanceFrameCommand.execute(16);
    view.pauseCommand.execute();
    view.menuCommand.execute();
    view.resumeCommand.execute();

    // assert
    expect(view.canContinue()).toBe(false);
    expect(add).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledWith({
      id: expect.any(String),
      game: 'pitfall-ii',
      completedAt: expect.any(String),
      score: 189000,
      goldCollected: 26,
      elapsedSeconds: 1450,
      outcome: 'completed',
    });

    // act
    snapshot.mockRestore();
    view.newGameCommand.execute();
    vi.spyOn(PitfallIIGame.prototype, 'snapshot', 'get').mockReturnValue(completed);
    view.advanceFrameCommand.execute(16);

    // assert
    expect(add).toHaveBeenCalledTimes(2);
  });

  it('suspends menu audio and disposes the canvas and sound when leaving the game route', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    TestBed.tick();
    view.enableAudio();
    view.toggleSoundCommand.execute();
    TestBed.tick();
    expect(browser.options).toBeDefined();
    expect(browser.audio.resume).toHaveBeenCalledOnce();
    expect(browser.audio.setMuted).toHaveBeenLastCalledWith(true);
    browser.audio.suspend.mockClear();
    browser.controller.releaseInputs.mockClear();

    // act
    view.menuCommand.execute();
    TestBed.tick();

    // assert
    expect(browser.audio.suspend).toHaveBeenCalled();
    expect(browser.controller.releaseInputs).toHaveBeenCalled();

    // act
    TestBed.resetTestingModule();

    // assert
    expect(browser.controller.dispose).toHaveBeenCalledOnce();
    expect(browser.audio.dispose).toHaveBeenCalledOnce();
  });
});
