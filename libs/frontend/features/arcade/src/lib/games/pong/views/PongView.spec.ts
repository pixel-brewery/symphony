// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import type { IArcadeCanvasOptions } from '../../shared/browser/IArcadeCanvasOptions';
import type { IPongSnapshot } from '../model/IPongSnapshot';
import { PongGame } from '../model/PongGame';
import type { PongInput } from '../model/PongInput';
import { PongView } from './PongView';

const browser = vi.hoisted(() => ({
  options: undefined as IArcadeCanvasOptions<PongInput> | undefined,
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
    FormFieldComponent: ControlStub,
    FormFieldStateDirective: ControlStub,
    SelectComponent: ControlStub,
    SelectItemComponent: ControlStub,
    KbdComponent: ControlStub,
    PageComponent: ControlStub,
    PageContentComponent: ControlStub,
    PageHeaderComponent: ControlStub,
    TextComponent: ControlStub,
    TypographyDirective: ControlStub,
    KBD_DEFAULT_PROPS: new InjectionToken('KBD_DEFAULT_PROPS'),
  };
});

vi.mock('../../../leaderboard/ArcadeLeaderboardStore', () => ({
  ArcadeLeaderboardStore: class ArcadeLeaderboardStore {},
}));

vi.mock('../../shared/browser/ArcadeCanvasController', () => ({
  ArcadeCanvasController: class ArcadeCanvasControllerStub {
    public readonly dispose = browser.controller.dispose;
    public readonly releaseInputs = browser.controller.releaseInputs;
    public readonly focus = browser.controller.focus;

    public constructor(options: IArcadeCanvasOptions<PongInput>) {
      browser.options = options;
    }
  },
}));

vi.mock('../audio/PongAudio', () => ({
  PongAudio: class PongAudioStub {
    public readonly reset = browser.audio.reset;
    public readonly dispose = browser.audio.dispose;
    public readonly resume = browser.audio.resume;
    public readonly suspend = browser.audio.suspend;
    public readonly setMuted = browser.audio.setMuted;
    public readonly update = browser.audio.update;
  },
}));

vi.mock('../rendering/PongRenderer', () => ({
  PongRenderer: class PongRendererStub {
    public readonly draw = vi.fn();
  },
}));

// #endregion

function createView() {
  const add = vi.fn(() => true);
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: ArcadeLeaderboardStore, useValue: { add } },
    ],
  });
  const view = TestBed.runInInjectionContext(() => new PongView(TestBed.inject(Router)));
  TestBed.tick();
  return { view, add };
}

describe('PongView', () => {
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

  it('preserves the serve and both players while the title and instructions are open', () => {
    // arrange
    const { view } = createView();
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'leftDown', active: true });
    view.advanceFrameCommand.execute(150);
    const before = view.snapshot;
    // act
    view.menuCommand.execute();
    view.instructionsCommand.execute();
    view.advanceFrameCommand.execute(1000);
    view.inputCommand.execute({ input: 'rightDown', active: true });
    view.resumeCommand.execute();
    // assert
    expect(view.screen()).toBe('game');
    expect(view.snapshot.paddles).toEqual(before.paddles);
    expect(view.snapshot.ball).toEqual(before.ball);
    expect(view.snapshot.serveFrames).toBe(before.serveFrames);
    expect(view.snapshot.elapsedSeconds).toBe(before.elapsedSeconds);
  });

  it('records one completed match with the two human scores and original target setting', () => {
    // arrange
    const { view, add } = createView();
    view.newGameCommand.execute();
    const completed: IPongSnapshot = {
      ...view.snapshot,
      status: 'gameOver',
      scores: [15, 13],
      targetScore: 15,
      winner: 0,
      elapsedSeconds: 120,
    };
    vi.spyOn(PongGame.prototype, 'snapshot', 'get').mockReturnValue(completed);
    // act
    view.advanceFrameCommand.execute(16);
    view.advanceFrameCommand.execute(16);
    view.pauseCommand.execute();
    view.menuCommand.execute();
    // assert
    expect(view.canContinue()).toBe(false);
    expect(add).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledWith({
      id: expect.any(String),
      game: 'pong',
      completedAt: expect.any(String),
      scores: [15, 13],
      targetScore: 15,
      winner: 0,
      elapsedSeconds: 120,
      opponent: 'human',
    });
  });

  it('suspends menu audio and disposes the shared browser controller and sound exactly once', () => {
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
    TestBed.resetTestingModule();
    // assert
    expect(browser.audio.resume).toHaveBeenCalledOnce();
    expect(browser.audio.setMuted).toHaveBeenLastCalledWith(true);
    expect(browser.audio.suspend).toHaveBeenCalled();
    expect(browser.controller.dispose).toHaveBeenCalledOnce();
    expect(browser.audio.dispose).toHaveBeenCalledOnce();
  });
});
