// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ArcadeGodModeStore } from '../../../god-mode/ArcadeGodModeStore';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import type { IArcadeCanvasOptions } from '../../shared/browser/IArcadeCanvasOptions';
import { CaliforniaGamesGame } from '../model/CaliforniaGamesGame';
import type { ICaliforniaGamesSnapshot } from '../model/ICaliforniaGamesSnapshot';
import { CaliforniaGamesView } from './CaliforniaGamesView';

const browser = vi.hoisted(() => ({
  options: undefined as IArcadeCanvasOptions<string> | undefined,
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

    public constructor(execute: (parameter: TParameter) => void) {
      this._execute = execute;
    }

    public execute(parameter?: TParameter): void {
      this._execute(parameter as TParameter);
    }
  }
  return { Command: CommandStub, CommandDirective: class CommandDirectiveStub {} };
});

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  class ControlStub {}
  return {
    TranslateDirective: ControlStub,
    ButtonComponent: ControlStub,
    CardActionsComponent: ControlStub,
    CardComponent: ControlStub,
    CardContentComponent: ControlStub,
    CardHeaderComponent: ControlStub,
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

    public constructor(options: IArcadeCanvasOptions<string>) {
      browser.options = options;
    }
  },
}));

vi.mock('../audio/CaliforniaGamesAudio', () => ({
  CaliforniaGamesAudio: class CaliforniaGamesAudioStub {
    public readonly reset = browser.audio.reset;
    public readonly dispose = browser.audio.dispose;
    public readonly resume = browser.audio.resume;
    public readonly suspend = browser.audio.suspend;
    public readonly setMuted = browser.audio.setMuted;
    public readonly update = browser.audio.update;
  },
}));

vi.mock('../rendering/CaliforniaGamesRenderer', () => ({
  CaliforniaGamesRenderer: class CaliforniaGamesRendererStub {
    public readonly draw = vi.fn();
  },
}));

// #endregion

function createView() {
  const add = vi.fn(() => true);
  const navigate = vi.fn(async () => true);
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { navigate } },
      { provide: ArcadeGodModeStore, useValue: { enabled: signal(false) } },
      { provide: ArcadeLeaderboardStore, useValue: { add } },
    ],
  });
  const view = TestBed.runInInjectionContext(
    () =>
      new CaliforniaGamesView(
        TestBed.inject(Router),
        TestBed.inject(ArcadeLeaderboardStore),
        TestBed.inject(ArcadeGodModeStore),
        TestBed.inject(DestroyRef),
      ),
  );
  TestBed.tick();
  return { add, navigate, view };
}

describe('CaliforniaGamesView', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    vi.restoreAllMocks();
    browser.options = undefined;
    TestBed.resetTestingModule();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('routes both local Lynx controls and advances the original intro into its menu', () => {
    // arrange
    const { view } = createView();
    const options = browser.options;
    if (!options) throw new Error('Canvas controller was not created.');

    // act
    options.onInput('1:a', true);
    options.onAdvance(17);
    options.onInput('1:a', false);
    options.onInput('1:a', true);
    options.onAdvance(17);
    options.onInput('2:left', true);

    // assert
    expect(view.snapshot.phase).toBe('menu');
    expect(view.snapshot.players).toBe(1);
    expect(view.screen()).toBe('menu');
  });

  it('restarts for two players and preserves an existing pause across the instructions', () => {
    // arrange
    const { view } = createView();
    view.pauseCommand.execute();
    expect(view.snapshot.status).toBe('paused');

    // act
    view.instructionsCommand.execute();
    view.closeInstructionsCommand.execute();
    view.togglePlayersCommand.execute();

    // assert
    expect(view.players()).toBe(2);
    expect(view.snapshot.players).toBe(2);
    expect(view.snapshot.phase).toBe('intro');
    expect(view.snapshot.status).toBe('running');
    expect(browser.audio.reset).toHaveBeenCalled();
  });

  it('records every completed event result once with the original event duration', () => {
    // arrange
    const { add, view } = createView();
    const completed: ICaliforniaGamesSnapshot = {
      ...view.snapshot,
      phase: 'event-over',
      resultId: 1,
      currentEvent: 'bmx',
      latestResults: [{ player: 1, event: 'bmx', score: 450 }],
      eventState: {
        kind: 'bmx',
        timer: 12,
        progress: 2800,
        trackLength: 2800,
        obstacles: [],
        riders: [],
      },
    };
    vi.spyOn(CaliforniaGamesGame.prototype, 'snapshot', 'get').mockReturnValue(completed);

    // act
    view.advanceFrameCommand.execute(17);
    view.advanceFrameCommand.execute(17);

    // assert
    expect(add).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledWith({
      id: expect.any(String),
      game: 'california-games',
      completedAt: expect.any(String),
      event: 'bmx',
      score: 450,
      player: 1,
      players: 1,
      elapsedSeconds: 78,
    });
  });

  it('releases controller and audio resources when the lazy route closes', () => {
    // arrange
    createView();

    // act
    TestBed.resetTestingModule();

    // assert
    expect(browser.controller.dispose).toHaveBeenCalled();
    expect(browser.audio.dispose).toHaveBeenCalled();
  });
});
