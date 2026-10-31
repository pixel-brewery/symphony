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
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import { ArcadeCanvasController } from '../../shared/browser/ArcadeCanvasController';
import { PongAudio } from '../audio/PongAudio';
import type { IPongSnapshot } from '../model/IPongSnapshot';
import { PongGame } from '../model/PongGame';
import type { PongInput } from '../model/PongInput';
import { PongRenderer } from '../rendering/PongRenderer';

// #endregion

const INPUTS: Readonly<Record<string, PongInput>> = {
  KeyW: 'leftUp',
  KeyS: 'leftDown',
  ArrowUp: 'rightUp',
  ArrowDown: 'rightDown',
};

/** Self-contained original two-player Pong with Symphony menus and shared canvas lifecycle. @public */
@Component({
  selector: 'symphony-pong-view',
  standalone: true,
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    ButtonComponent,
    CardActionsComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CommandDirective,
    FormField,
    FormFieldComponent,
    FormFieldStateDirective,
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
  templateUrl: './PongView.html',
  styleUrl: './PongView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PongView {
  // #region Fields

  private readonly _game = new PongGame();
  private readonly _attract = new PongGame();
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _canvas = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new PongRenderer();
  private readonly _audio = new PongAudio();
  private readonly _setup = signal({ targetScore: '11' });
  private _controller: ArcadeCanvasController<PongInput> | undefined;
  private _snapshot = this._game.snapshot;
  private _matchRecorded = false;

  /** Operator score switch for the next match. @public */
  public readonly setupForm = form(this._setup);
  /** Current title, instruction or playfield surface. @public */
  public readonly screen = signal<'intro' | 'instructions' | 'game'>('intro');
  /** Current cabinet phase. @public */
  public readonly status = signal(this._snapshot.status);
  /** Two human players' score counters. @public */
  public readonly scores = signal(this._snapshot.scores);
  /** Original operator target of the running match. @public */
  public readonly targetScore = signal<11 | 15>(11);
  /** Winning player, available after the last point. @public */
  public readonly winner = signal<0 | 1 | null>(null);
  /** Whether this visit has a started match. @public */
  public readonly hasMatch = signal(false);
  /** Whether the current match can continue. @public */
  public readonly canContinue = computed(() => this.hasMatch() && this.status() !== 'gameOver');
  /** User sound preference for this visit. @public */
  public readonly soundMuted = signal(false);
  /** Whether the browser can draw the court. @public */
  public readonly screenAvailable = signal(true);
  /** Returns to the shared Arcade hub. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a match using the selected operator switch. @public */
  public readonly newGameCommand = new Command(() =>
    this.startMatch(this._setup().targetScore === '15' ? 15 : 11),
  );
  /** Replays the current eleven- or fifteen-point match. @public */
  public readonly rematchCommand = new Command(() => this.startMatch(this.targetScore()));
  /** Opens the title while preserving the current rally. @public */
  public readonly menuCommand = new Command(() => {
    this._game.pause();
    this.screen.set('intro');
    this.projectSnapshot();
  });
  /** Shows control and cabinet rules. @public */
  public readonly instructionsCommand = new Command(() => this.screen.set('instructions'));
  /** Resumes a preserved match. @public */
  public readonly resumeCommand = new Command(() => {
    if (this._game.snapshot.status === 'paused') this._game.togglePause();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Advances either the active cabinet or the silent title demonstration. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.screen() === 'game' || !this.hasMatch()) {
      this._game.step(elapsed);
      this.projectSnapshot();
    } else this._attract.step(elapsed);
  });
  /** Applies one player's paddle controls. @public */
  public readonly inputCommand = new Command<{ input: PongInput; active: boolean }>((value) => {
    if (this.screen() === 'game') this._game.setInput(value.input, value.active);
  });
  /** Maps each half of the court to its human player's potentiometer. @public */
  public readonly pointerCommand = new Command<{ x: number; y: number }>((value) => {
    if (this.screen() === 'game') {
      this._game.movePointer(value.x, value.y);
      this.projectSnapshot();
    }
  });
  /** Pauses the match when browser focus is lost. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Releases held keys without changing the paddle settings. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Pauses or resumes the current rally and automatic-serve countdown. @public */
  public readonly togglePauseCommand = new Command(
    () => {
      this._game.togglePause();
      this.projectSnapshot();
    },
    computed(() => this.screen() === 'game' && this.status() !== 'gameOver'),
  );
  /** Enables or silences the three cabinet sounds. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));
  /** Reports an unavailable drawing context. @public */
  public readonly screenUnavailableCommand = new Command(() => this.screenAvailable.set(false));

  // #endregion

  // #region Ctor

  /** Connects shared browser lifecycle and releases input/audio when the route closes. @public */
  public constructor(router: Router) {
    this.backArcadeCommand = new Command(() => {
      this._game.pause();
      void router.navigate(['/main/arcade']);
    });
    effect(() => {
      const canvas = this._canvas()?.nativeElement;
      if (!canvas || this._controller) return;
      this._controller = new ArcadeCanvasController({
        canvas,
        inputs: INPUTS,
        isActive: () => this.screen() === 'game',
        onAdvance: (elapsed) => this.advanceFrameCommand.execute(elapsed),
        onDraw: (context, target) => {
          const state =
            this.screen() === 'game' || !this.hasMatch() ? this._snapshot : this._attract.snapshot;
          this._renderer.draw(context, state, target);
          if (this.screen() === 'game') this._audio.update(this._snapshot);
          target.dataset['frame'] = String(state.frame);
          target.dataset['ballX'] = String(state.ball.x);
          target.dataset['ballY'] = String(state.ball.y);
          target.dataset['ballVx'] = String(state.ball.vx);
          target.dataset['ballVy'] = String(state.ball.vy);
          target.dataset['leftPaddle'] = String(state.paddles[0]);
          target.dataset['rightPaddle'] = String(state.paddles[1]);
        },
        onInput: (input, active) => this.inputCommand.execute({ input, active }),
        onReleaseInputs: () => this.releaseInputsCommand.execute(),
        onPause: () => this.pauseCommand.execute(),
        onTogglePause: () => this.togglePauseCommand.execute(),
        onAudioResume: () => this.enableAudio(),
        onAudioSuspend: () => this._audio.suspend(),
        onUnavailable: () => this.screenUnavailableCommand.execute(),
        onPointerMove: (x, y) => this.pointerCommand.execute({ x, y }),
        onPointerDown: (x, y) => this.pointerCommand.execute({ x, y }),
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
      this._audio.dispose();
    });
  }

  // #endregion

  // #region Properties

  /** Last immutable cabinet frame for rendering and acceptance checks. @public @readonly */
  public get snapshot(): IPongSnapshot {
    return this._snapshot;
  }

  // #endregion

  // #region Methods

  /** Restores keyboard focus after an explicit start, reset or resume action. @public */
  public focusScreen(): void {
    queueMicrotask(() => this._controller?.focus());
  }

  /** Unlocks cabinet sound following a real player gesture. @public */
  public enableAudio(): void {
    if (this.screen() === 'game' && this.status() !== 'paused') void this._audio.resume();
  }

  private startMatch(targetScore: 11 | 15): void {
    this._audio.reset();
    this._game.newGame(targetScore);
    this._matchRecorded = false;
    this.hasMatch.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    this._snapshot = this._game.snapshot;
    this.status.set(this._snapshot.status);
    this.scores.set(this._snapshot.scores);
    this.targetScore.set(this._snapshot.targetScore);
    this.winner.set(this._snapshot.winner);
    if (this.hasMatch() && !this._matchRecorded && this._snapshot.winner !== null) {
      this._matchRecorded = true;
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'pong',
        completedAt: new Date().toISOString(),
        scores: this._snapshot.scores,
        targetScore: this._snapshot.targetScore,
        winner: this._snapshot.winner,
        elapsedSeconds: this._snapshot.elapsedSeconds,
        opponent: 'human',
      });
    }
  }

  // #endregion
}
