// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import { NotificationService } from '@symphony/frontend-notification';
import { NEVER } from 'rxjs';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BreakoutView } from './BreakoutView';

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
  return {
    Command: CommandStub,
    CommandDirective: class CommandDirectiveStub {},
    NotificationService: class NotificationService {},
    View: class View {},
    VIEW_PRESENTER: Symbol('VIEW_PRESENTER'),
    ViewPresenter: class ViewPresenter {},
  };
});

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  class ControlStub {}
  return {
    ButtonComponent: ControlStub,
    Cancel: {
      negative: () => ({ reason: 'negative' }),
      none: () => ({ reason: 'none' }),
      positive: <T>(result: T) => ({ reason: 'positive', result }),
    },
    CardActionsComponent: ControlStub,
    CardComponent: ControlStub,
    CardContentComponent: ControlStub,
    CardHeaderComponent: ControlStub,
    DialogContentDirective: ControlStub,
    DialogFooterDirective: ControlStub,
    DialogHeaderComponent: ControlStub,
    DialogHeaderDirective: ControlStub,
    DIALOG_REF: new InjectionToken('DIALOG_REF'),
    DIALOG_REF_DATA: new InjectionToken('DIALOG_REF_DATA'),
    FormFieldComponent: ControlStub,
    FormFieldStateDirective: ControlStub,
    DialogService: class DialogService {},
    IconNameDirective: ControlStub,
    KbdComponent: ControlStub,
    PageComponent: ControlStub,
    PageContentComponent: ControlStub,
    PageHeaderComponent: ControlStub,
    SelectComponent: ControlStub,
    SelectItemComponent: ControlStub,
    TextComponent: ControlStub,
    TypographyDirective: ControlStub,
    KBD_DEFAULT_PROPS: new InjectionToken('KBD_DEFAULT_PROPS'),
  };
});

vi.mock('../../../leaderboard/ArcadeLeaderboardStore', () => ({
  ArcadeLeaderboardStore: class ArcadeLeaderboardStore {},
}));

// #endregion

describe('BreakoutView', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('preserves the current ball and cartridge options while menu choices change', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: DialogService,
          useValue: {
            show: vi.fn(() => ({
              close: vi.fn(),
              closed: NEVER,
              overlayRef: { detachments: () => NEVER },
            })),
          },
        },
        { provide: NotificationService, useValue: { showSuccess: vi.fn() } },
        { provide: ArcadeLeaderboardStore, useValue: { add: vi.fn(), entries: () => [] } },
      ],
    });
    const view = TestBed.runInInjectionContext(() => new BreakoutView(TestBed.inject(Router)));
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'fire', active: true });
    view.inputCommand.execute({ input: 'fire', active: false });
    view.advanceFrameCommand.execute(100);
    const ball = view.snapshot.ball;
    const frame = view.snapshot.frame;

    // act
    view.menuCommand.execute();
    view.setupForm.variation().value.set('7');
    view.setupForm.players().value.set('4');
    view.advanceFrameCommand.execute(200);
    view.resumeCommand.execute();

    // assert
    expect(view.screen()).toBe('game');
    expect(view.status()).toBe('playing');
    expect(view.snapshot.frame).toBe(frame);
    expect(view.snapshot.ball).toEqual(ball);
    expect(view.snapshot.options).toMatchObject({ variation: 1, players: 1 });
    expect(view.selectedVariation().id).toBe(7);
    expect(view.selectedPlayers()).toBe(4);
  });

  it('starts the selected teams and replays those options even after editing the next match', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: DialogService,
          useValue: {
            show: vi.fn(() => ({
              close: vi.fn(),
              closed: NEVER,
              overlayRef: { detachments: () => NEVER },
            })),
          },
        },
        { provide: NotificationService, useValue: { showSuccess: vi.fn() } },
        { provide: ArcadeLeaderboardStore, useValue: { add: vi.fn(), entries: () => [] } },
      ],
    });
    const view = TestBed.runInInjectionContext(() => new BreakoutView(TestBed.inject(Router)));
    view.setupForm.variation().value.set('12');
    view.setupForm.players().value.set('4');
    view.setupForm.difficultyA().value.set('B');
    view.setupForm.difficultyB().value.set('A');
    view.newGameCommand.execute();
    view.inputCommand.execute({ input: 'secondRight', active: true });
    view.advanceFrameCommand.execute(150);

    // act
    view.menuCommand.execute();
    view.setupForm.players().value.set('1');
    view.setupForm.variation().value.set('1');
    view.rematchCommand.execute();

    // assert
    expect(view.status()).toBe('ready');
    expect(view.snapshot.options).toEqual({
      variation: 12,
      players: 4,
      difficultyA: 'B',
      difficultyB: 'A',
    });
    expect(view.teams().map((team) => team.players)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(view.teams().every((team) => team.ballsRemaining === 5 && team.score === 0)).toBe(true);
    expect(view.snapshot.frame).toBe(0);
    expect(view.snapshot.paddles).toHaveLength(2);
  });
});
