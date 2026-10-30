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
import type { ISeaquestSnapshot } from '../model/ISeaquestSnapshot';
import { SeaquestGame } from '../model/SeaquestGame';
import type { SeaquestInput } from '../model/SeaquestInput';
import { SeaquestView } from './SeaquestView';

const browser = vi.hoisted(() => ({
  options: undefined as IArcadeCanvasOptions<SeaquestInput> | undefined,
  controller: { dispose: vi.fn(), releaseInputs: vi.fn(), focus: vi.fn() },
  audio: {
    reset: vi.fn(),
    dispose: vi.fn(),
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(),
    setMuted: vi.fn(),
    consume: vi.fn(),
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
    SelectComponent: ControlStub,
    SelectItemComponent: ControlStub,
    FormFieldComponent: ControlStub,
    FormFieldStateDirective: ControlStub,
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

    public constructor(options: IArcadeCanvasOptions<SeaquestInput>) {
      browser.options = options;
    }
  },
}));

vi.mock('../audio/SeaquestAudio', () => ({
  SeaquestAudio: class SeaquestAudioStub {
    public readonly reset = browser.audio.reset;
    public readonly dispose = browser.audio.dispose;
    public readonly resume = browser.audio.resume;
    public readonly suspend = browser.audio.suspend;
    public readonly setMuted = browser.audio.setMuted;
    public readonly consume = browser.audio.consume;
  },
}));

vi.mock('../rendering/SeaquestRenderer', () => ({
  SeaquestRenderer: class SeaquestRendererStub {
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
  const view = TestBed.runInInjectionContext(() => new SeaquestView(TestBed.inject(Router)));
  TestBed.tick();
  return { view, add };
}

describe('SeaquestView', () => {
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

  it('preserves the dive through menus and ignores pending console choices on continue', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'down', active: true });
    view.advanceFrameCommand.execute(200);
    const before = view.snapshot;

    // act
    view.menuCommand.execute();
    view.setupForm.players().value.set('2');
    view.setupForm.difficultyA().value.set('A');
    view.instructionsCommand.execute();
    view.advanceFrameCommand.execute(200);
    view.resumeCommand.execute();

    // assert
    expect(view.screen()).toBe('game');
    expect(view.status()).toBe('playing');
    expect(view.snapshot.player).toEqual(before.player);
    expect(view.snapshot.frame).toBe(before.frame);
    expect(view.snapshot.options).toEqual({ players: 1, difficultyA: 'B', difficultyB: 'B' });
  });

  it('starts selected alternating players and resets with active settings', () => {
    // arrange
    const { view } = createView();
    view.setupForm.players().value.set('2');
    view.setupForm.difficultyB().value.set('A');
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'down', active: true });
    view.advanceFrameCommand.execute(200);
    view.menuCommand.execute();
    view.setupForm.players().value.set('1');

    // act
    view.resetCommand.execute();

    // assert
    expect(view.snapshot).toMatchObject({
      status: 'ready',
      oxygen: 64,
      score: 0,
      options: { players: 2, difficultyB: 'A' },
    });
    expect(view.players()).toHaveLength(2);
    expect(view.snapshot.frame).toBe(0);
    expect(browser.audio.reset).toHaveBeenCalledTimes(2);
  });

  it('records each finalized player once even when the other player is still playing', () => {
    // arrange
    const { view, add } = createView();
    view.setupForm.players().value.set('2');
    view.newGameCommand.execute();
    const initial = view.snapshot;
    const projected: ISeaquestSnapshot = {
      ...initial,
      status: 'playing',
      currentPlayer: 2,
      players: [
        { ...initial.players[0]!, score: 14200, level: 6, elapsedSeconds: 240, outcome: 'lost' },
        initial.players[1]!,
      ],
    };
    const snapshot = vi.spyOn(SeaquestGame.prototype, 'snapshot', 'get').mockReturnValue(projected);

    // act
    view.advanceFrameCommand.execute(16);
    view.advanceFrameCommand.execute(16);
    snapshot.mockReturnValue({
      ...projected,
      status: 'completed',
      players: [
        projected.players[0]!,
        {
          ...initial.players[1]!,
          score: 999999,
          level: 91,
          elapsedSeconds: 1080,
          outcome: 'completed',
        },
      ],
    });
    view.advanceFrameCommand.execute(16);
    view.pauseCommand.execute();
    view.menuCommand.execute();

    // assert
    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        game: 'seaquest',
        player: 1,
        score: 14200,
        level: 6,
        outcome: 'lost',
        elapsedSeconds: 240,
      }),
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        game: 'seaquest',
        player: 2,
        score: 999999,
        level: 91,
        outcome: 'completed',
        elapsedSeconds: 1080,
      }),
    );
    expect(view.canContinue()).toBe(false);
  });

  it('uses shared browser pause, respects mute and disposes input and audio on route teardown', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'down', active: true });
    view.advanceFrameCommand.execute(100);

    // act
    browser.options!.onPause();
    view.toggleSoundCommand.execute();
    TestBed.tick();
    const paused = view.snapshot;
    view.advanceFrameCommand.execute(200);
    TestBed.resetTestingModule();

    // assert
    expect(view.snapshot).toEqual(paused);
    expect(paused.status).toBe('paused');
    expect(browser.audio.setMuted).toHaveBeenLastCalledWith(true);
    expect(browser.controller.releaseInputs).toHaveBeenCalled();
    expect(browser.controller.dispose).toHaveBeenCalledOnce();
    expect(browser.audio.dispose).toHaveBeenCalledOnce();
  });
});
