// @vitest-environment jsdom

// #region Imports

import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArcadeGodModeStore } from '../../../god-mode/ArcadeGodModeStore';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import type { IArcadeCanvasOptions } from '../../shared/browser/IArcadeCanvasOptions';
import type { IJungleHuntSnapshot } from '../model/IJungleHuntSnapshot';
import { JungleHuntGame } from '../model/JungleHuntGame';
import type { JungleHuntInput } from '../model/JungleHuntInput';
import { JungleHuntView } from './JungleHuntView';

const browser = vi.hoisted(() => ({
  options: undefined as IArcadeCanvasOptions<JungleHuntInput> | undefined,
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

    public constructor(options: IArcadeCanvasOptions<JungleHuntInput>) {
      browser.options = options;
    }
  },
}));

vi.mock('../audio/JungleHuntAudio', () => ({
  JungleHuntAudio: class JungleHuntAudioStub {
    public readonly reset = browser.audio.reset;
    public readonly dispose = browser.audio.dispose;
    public readonly resume = browser.audio.resume;
    public readonly suspend = browser.audio.suspend;
    public readonly setMuted = browser.audio.setMuted;
    public readonly update = browser.audio.update;
  },
}));

vi.mock('../rendering/JungleHuntRenderer', () => ({
  JungleHuntRenderer: class JungleHuntRendererStub {
    public readonly draw = vi.fn();
  },
}));

// #endregion

function createView() {
  const add = vi.fn((entry: unknown) => {
    void entry;
    return true;
  });
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: ArcadeGodModeStore, useValue: { enabled: signal(false) } },
      { provide: ArcadeLeaderboardStore, useValue: { add } },
    ],
  });
  const view = TestBed.runInInjectionContext(
    () =>
      new JungleHuntView(
        TestBed.inject(Router),
        TestBed.inject(ArcadeLeaderboardStore),
        TestBed.inject(ArcadeGodModeStore),
        TestBed.inject(DestroyRef),
      ),
  );
  TestBed.tick();
  return { view, add };
}

describe('JungleHuntView', () => {
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

  it('preserves the current stage, timer and player through menus and instructions', () => {
    // arrange
    const { view, add } = createView();
    view.newGameCommand.execute();
    view.advanceFrameCommand.execute(200);
    const before = view.snapshot;
    // act
    view.menuCommand.execute();
    view.instructionsCommand.execute();
    view.advanceFrameCommand.execute(250);
    view.inputCommand.execute({ input: 'fire', active: true });
    // assert
    expect(view.screen()).toBe('instructions');
    expect(view.snapshot).toMatchObject({
      status: 'paused',
      frame: before.frame,
      player: before.player,
      timer: before.timer,
    });
    expect(add).not.toHaveBeenCalled();
    // act
    view.resumeCommand.execute();
    // assert
    expect(view.snapshot.status).toBe('playing');
    expect(view.snapshot.player).toEqual(before.player);
  });

  it('changes skill only for a fresh game and resets all run state', () => {
    // arrange
    const { view, add } = createView();
    view.newGameCommand.execute();
    view.advanceFrameCommand.execute(250);
    view.menuCommand.execute();
    // act
    view.selectSkillCommand.execute();
    view.resumeCommand.execute();
    // assert
    expect(view.snapshot.options.skill).toBe(1);
    // act
    view.newGameCommand.execute();
    // assert
    expect(view.snapshot).toMatchObject({
      frame: 0,
      options: { skill: 2 },
      score: 0,
      lives: 5,
      timer: 500,
      stage: 'vines',
    });
    expect(add).not.toHaveBeenCalled();
  });

  it('records an ended run once and never records an ordinary menu visit', () => {
    // arrange
    const { view, add } = createView();
    view.newGameCommand.execute();
    view.menuCommand.execute();
    expect(add).not.toHaveBeenCalled();
    // act
    view.endGameCommand.execute();
    view.advanceFrameCommand.execute(16);
    view.pauseCommand.execute();
    view.menuCommand.execute();
    // assert
    expect(add).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledWith({
      id: expect.any(String),
      game: 'jungle-hunt',
      completedAt: expect.any(String),
      score: 0,
      level: 1,
      player: 1,
      elapsedSeconds: 0,
      outcome: 'lost',
    });
    expect(view.canContinue()).toBe(false);
  });

  it('records final scores for each run after a rescue and later reset independently', () => {
    // arrange
    const { view, add } = createView();
    view.newGameCommand.execute();
    const completed: IJungleHuntSnapshot = {
      ...view.snapshot,
      status: 'gameOver',
      outcome: 'completed',
      score: 16500,
      level: 2,
      rescues: 1,
      elapsed: 123,
    };
    const snapshot = vi
      .spyOn(JungleHuntGame.prototype, 'snapshot', 'get')
      .mockReturnValue(completed);
    // act
    view.advanceFrameCommand.execute(16);
    view.advanceFrameCommand.execute(16);
    // assert
    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0]?.[0]).toMatchObject({
      score: 16500,
      level: 2,
      player: 1,
      elapsedSeconds: 123,
      outcome: 'completed',
    });
    // act
    snapshot.mockRestore();
    view.newGameCommand.execute();
    view.endGameCommand.execute();
    // assert
    expect(add).toHaveBeenCalledTimes(2);
  });

  it('suspends sound on menus and releases browser and audio resources on route disposal', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    TestBed.tick();
    view.enableAudio();
    view.toggleSoundCommand.execute();
    TestBed.tick();
    // act
    view.menuCommand.execute();
    TestBed.tick();
    // assert
    expect(browser.audio.resume).toHaveBeenCalledOnce();
    expect(browser.audio.setMuted).toHaveBeenLastCalledWith(true);
    expect(browser.audio.suspend).toHaveBeenCalled();
    expect(browser.controller.releaseInputs).toHaveBeenCalled();
    // act
    TestBed.resetTestingModule();
    // assert
    expect(browser.controller.dispose).toHaveBeenCalledOnce();
    expect(browser.audio.dispose).toHaveBeenCalledOnce();
  });
});
