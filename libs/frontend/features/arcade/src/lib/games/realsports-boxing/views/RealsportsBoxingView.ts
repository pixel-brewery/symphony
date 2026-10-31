// #region Imports

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import {
  ButtonComponent,
  CardActionsComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  FormFieldComponent,
  FormFieldStateDirective,
  IconNameDirective,
  KBD_DEFAULT_PROPS,
  KbdComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectItemComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, CommandDirective } from '@symphony/frontend-core';
import { ArcadeGodModeStore } from '../../../god-mode/ArcadeGodModeStore';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import { ArcadeCanvasController } from '../../shared/browser/ArcadeCanvasController';
import { RealsportsBoxingAudio } from '../audio/RealsportsBoxingAudio';
import type { BoxingContenderId } from '../model/BoxingContenderId';
import { BoxingContenders } from '../model/BoxingContenders';
import type { BoxingControl } from '../model/BoxingControl';
import type { IBoxingSnapshot } from '../model/IBoxingSnapshot';
import { RealsportsBoxingGame } from '../model/RealsportsBoxingGame';
import { RealsportsBoxingRenderer } from '../rendering/RealsportsBoxingRenderer';
import { BoxingContenderNamePipe } from './BoxingContenderNamePipe';
import type { BoxingScreen } from './BoxingScreen';

// #endregion

interface IBoxingSetup {
  players: 1 | 2;
  difficulty: 'A' | 'B';
  firstContender: BoxingContenderId;
  secondContender: BoxingContenderId;
}

type BoxingKeyboardInput = `${0 | 1}:${BoxingControl}`;

const INPUTS: Readonly<Record<string, BoxingKeyboardInput>> = {
  ArrowLeft: '0:left',
  ArrowRight: '0:right',
  ArrowUp: '0:up',
  ArrowDown: '0:down',
  Space: '0:fire',
  KeyA: '1:left',
  KeyD: '1:right',
  KeyW: '1:up',
  KeyS: '1:down',
  KeyF: '1:fire',
};

/** Composes the original boxing match with Symphony menus and shared canvas lifecycle. @public */
@Component({
  selector: 'symphony-realsports-boxing-view',
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    BoxingContenderNamePipe,
    ButtonComponent,
    CardActionsComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CommandDirective,
    FormField,
    FormFieldComponent,
    FormFieldStateDirective,
    IconNameDirective,
    KbdComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    SelectComponent,
    SelectItemComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: KBD_DEFAULT_PROPS, useValue: { value: [] } }],
  templateUrl: './RealsportsBoxingView.html',
  styleUrl: './RealsportsBoxingView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RealsportsBoxingView {
  // #region Fields

  private readonly _game = new RealsportsBoxingGame();
  private readonly _godMode = inject(ArcadeGodModeStore);
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private _snapshot: IBoxingSnapshot = this._game.snapshot;
  private _matchRecorded = false;
  private readonly _setup = signal<IBoxingSetup>({
    players: 1,
    difficulty: 'B',
    firstContender: 'iron-fists',
    secondContender: 'jabbin-jack',
  });
  private readonly _canStart = computed(
    () => this._setup().firstContender !== this._setup().secondContender,
  );

  /** The original four contenders and their documented weaknesses. @public */
  public readonly contenders = BoxingContenders;
  /** Signal Form for the next match; changes do not alter a paused match. @public */
  public readonly setup = form(this._setup);
  /** Visible menu or playfield. @public */
  public readonly screen = signal<BoxingScreen>('intro');
  /** Current phase, including the opening bell, rest and knockdown count. @public */
  public readonly status = signal(this._snapshot.status);
  /** Options belonging to the currently running or completed match. @public */
  public readonly matchOptions = signal(this._snapshot.options);
  /** The round currently being played. @public */
  public readonly round = signal(this._snapshot.round);
  /** Whole seconds on the current round clock. @public */
  public readonly secondsRemaining = signal(Math.ceil(this._snapshot.secondsRemaining));
  /** Referee's current knockdown count. @public */
  public readonly count = signal(this._snapshot.count);
  /** Player being counted out, if any. @public */
  public readonly downedPlayer = signal(this._snapshot.downedPlayer);
  /** Match result retained while its celebration and attract fight run. @public */
  public readonly result = signal(this._snapshot.result);
  /** Whether the user has started a match during this visit. @public */
  public readonly hasMatch = signal(false);
  /** Whether the title screen can continue a preserved match. @public */
  public readonly canContinue = computed(() => this.hasMatch() && this.result() === null);
  /** Whether the browser could create the playfield. @public */
  public readonly screenAvailable = signal(true);
  /** Sound choice for this visit. @public */
  public readonly soundMuted = signal(false);
  /** Returns to the game gallery. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a match with the current selection. @public */
  public readonly startCommand = new Command(() => {
    const selection = this._setup();
    this._game.startMatch({
      players: selection.players,
      difficulty: selection.difficulty,
      contenders: [selection.firstContender, selection.secondContender],
    });
    this._matchRecorded = false;
    this.hasMatch.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  }, this._canStart);
  /** Replays the same matchup without replacing it with pending menu selections. @public */
  public readonly rematchCommand = new Command(() => {
    this._game.startMatch(this._snapshot.options);
    this._matchRecorded = false;
    this.hasMatch.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  });
  /** Opens the title screen, keeping an unfinished match paused. @public */
  public readonly menuCommand = new Command(() => this.openMenu('intro'));
  /** Opens the original control combinations and match rules. @public */
  public readonly instructionsCommand = new Command(() => this.openMenu('instructions'));
  /** Restores the exact paused round or knockdown phase. @public */
  public readonly resumeCommand = new Command(() => {
    if (this._snapshot.status === 'paused') this._game.togglePause();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Advances visible matches and the title's silent demonstration. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.screen() === 'game' || (this.screen() === 'intro' && !this.canContinue())) {
      this._game.step(elapsed);
      this.projectSnapshot();
    }
  });
  /** Samples the corresponding original joystick, without accepting menu input. @public */
  public readonly inputCommand = new Command<{
    player: 0 | 1;
    control: BoxingControl;
    active: boolean;
  }>((value) => {
    if (this.screen() !== 'game' || this.result() !== null) return;
    if (value.player === 1 && this._snapshot.options.players === 1) return;
    this._game.setInput(value.player, value.control, value.active);
    this.projectSnapshot();
  });
  /** Pauses on window or application focus loss. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Releases both joysticks when focus moves to application controls. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Toggles pause during a match while retaining the original phase. @public */
  public readonly togglePauseCommand = new Command(
    () => {
      this._game.togglePause();
      this.projectSnapshot();
    },
    computed(() => this.screen() === 'game' && this.canContinue()),
  );
  /** Enables or silences match effects. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));
  /** Exposes a browser drawing failure at the place it can be retried. @public */
  public readonly screenUnavailableCommand = new Command(() => this.screenAvailable.set(false));

  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('ringCanvas');
  private readonly _renderer = new RealsportsBoxingRenderer();
  private readonly _audio = new RealsportsBoxingAudio();
  private readonly _destroyRef = inject(DestroyRef);
  private _controller: ArcadeCanvasController<BoxingKeyboardInput> | undefined;

  // #endregion

  // #region Ctor

  /** Connects shared browser input to the two original joysticks. @public */
  public constructor(router: Router) {
    this.backArcadeCommand = new Command(() => {
      this._game.pause();
      void router.navigate(['/main/arcade']);
    });
    effect(() => this._game.setGodMode(this._godMode.enabled()));
    effect(() => {
      const screen = this._screen();
      if (!screen || this._controller) return;
      this._controller = new ArcadeCanvasController({
        canvas: screen.nativeElement,
        inputs: INPUTS,
        isActive: () => this.screen() === 'game' && this.result() === null,
        onAdvance: (elapsed) => this.advanceFrameCommand.execute(elapsed),
        onDraw: (context, canvas) => {
          const snapshot = this.snapshot;
          this._renderer.draw(context, snapshot, canvas);
          this._audio.update(
            snapshot,
            this.screen() === 'game' && snapshot.status !== 'paused' && snapshot.status !== 'demo',
          );
          for (const [index, fighter] of snapshot.fighters.entries()) {
            const player = index + 1;
            canvas.dataset[`player${player}X`] = String(fighter.x);
            canvas.dataset[`player${player}Y`] = String(fighter.y);
            canvas.dataset[`player${player}Pose`] = fighter.pose;
            canvas.dataset[`player${player}Score`] = String(fighter.score);
            canvas.dataset[`player${player}Strength`] = String(fighter.strength);
          }
          canvas.dataset['frame'] = String(snapshot.frame);
        },
        onInput: (input, active) =>
          this.inputCommand.execute({
            player: input.startsWith('0:') ? 0 : 1,
            control: input.slice(2) as BoxingControl,
            active,
          }),
        onReleaseInputs: () => this.releaseInputsCommand.execute(),
        onPause: () => this.pauseCommand.execute(),
        onTogglePause: () => this.togglePauseCommand.execute(),
        onAudioResume: () => this.enableAudio(),
        onAudioSuspend: () => this._audio.suspend(),
        onUnavailable: () => this.screenUnavailableCommand.execute(),
      });
    });
    effect(() => this._audio.setMuted(this.soundMuted()));
    effect(() => {
      if (this.screen() !== 'game' || this.status() === 'paused') {
        this._controller?.releaseInputs();
        this._audio.suspend();
      }
    });
    this._destroyRef.onDestroy(() => {
      this._controller?.dispose();
      this.releaseInputsCommand.execute();
      this._audio.dispose();
    });
  }

  // #endregion

  // #region Properties

  /** Last simulation frame, consumed by drawing and audio without a second state store. @public */
  public get snapshot(): IBoxingSnapshot {
    return this._snapshot;
  }

  // #endregion

  // #region Methods

  /** Returns focus to the ring following an explicit game action. @public */
  public focusScreen(): void {
    // CommandDirective completes the action after Angular's click listener in this event.
    queueMicrotask(() => this._controller?.focus());
  }

  /** Unlocks sound only for a visible, unpaused user match. @public */
  public enableAudio(): void {
    if (this.screen() === 'game' && this.status() !== 'paused' && this.status() !== 'demo')
      void this._audio.resume();
  }

  private openMenu(screen: BoxingScreen): void {
    this._game.pause();
    if (screen === 'intro' && !this.canContinue()) this._game.startDemo();
    this.screen.set(screen);
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    this._snapshot = this._game.snapshot;
    this.status.set(this._snapshot.status);
    this.matchOptions.set(this._snapshot.options);
    this.round.set(this._snapshot.round);
    this.secondsRemaining.set(Math.ceil(this._snapshot.secondsRemaining));
    this.count.set(this._snapshot.count);
    this.downedPlayer.set(this._snapshot.downedPlayer);
    this.result.set(this._snapshot.result);
    if (this.hasMatch() && !this._matchRecorded && this._snapshot.result) {
      this._matchRecorded = true;
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'realsports-boxing',
        completedAt: new Date().toISOString(),
        players: this._snapshot.options.players,
        difficulty: this._snapshot.options.difficulty,
        contenders: this._snapshot.options.contenders,
        winner: this._snapshot.result.winner,
        reason: this._snapshot.result.reason,
        scores: this._snapshot.result.scores,
        round: this._snapshot.result.round,
      });
    }
  }

  // #endregion
}
