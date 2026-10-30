// #region Imports

import { DecimalPipe } from '@angular/common';
import {
  type AfterViewInit,
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
import { form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import {
  ButtonComponent,
  Cancel,
  CardActionsComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  DialogService,
  type IDialogRef,
  KBD_DEFAULT_PROPS,
  KbdComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, CommandDirective } from '@symphony/frontend-core';
import { take } from 'rxjs';
import { ArcadeGodModeStore } from '../../../god-mode/ArcadeGodModeStore';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import { ArcadeCanvasController } from '../../shared/browser/ArcadeCanvasController';
import { BreakoutAudio } from '../audio/BreakoutAudio';
import { BreakoutGame } from '../model/BreakoutGame';
import type { BreakoutInput } from '../model/BreakoutInput';
import { BreakoutVariations } from '../model/BreakoutVariations';
import type { IBreakoutOptions } from '../model/IBreakoutOptions';
import type { IBreakoutSnapshot } from '../model/IBreakoutSnapshot';
import { BreakoutRenderer } from '../rendering/BreakoutRenderer';
import type { BreakoutMenuDialogResult } from './BreakoutMenuDialogResult';
import { BreakoutMenuDialogView } from './BreakoutMenuDialogView';
import type { BreakoutScreen } from './BreakoutScreen';
import type { IBreakoutMenuDialogData } from './IBreakoutMenuDialogData';
import type { IBreakoutSetup } from './IBreakoutSetup';

// #endregion

const INPUTS: Readonly<Record<string, BreakoutInput>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyJ: 'secondLeft',
  KeyL: 'secondRight',
  Space: 'fire',
  KeyK: 'secondFire',
};

/** Full-area Breakout playfield with the shared Arcade browser lifecycle. @public */
@Component({
  selector: 'symphony-breakout-view',
  standalone: true,
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    ButtonComponent,
    CardActionsComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CommandDirective,
    DecimalPipe,
    KbdComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: KBD_DEFAULT_PROPS, useValue: { value: [] } }],
  templateUrl: './BreakoutView.html',
  styleUrl: './BreakoutView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakoutView implements AfterViewInit {
  // #region Fields

  private readonly _game = new BreakoutGame();
  private readonly _godMode = inject(ArcadeGodModeStore);
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private readonly _dialogService = inject(DialogService);
  private _snapshot = this._game.snapshot;
  private _matchRecorded = false;
  private _activeMenuDialog:
    IDialogRef<IBreakoutMenuDialogData, BreakoutMenuDialogResult> | undefined;
  private _destroyed = false;
  private readonly _setup = signal<IBreakoutSetup>({
    variation: '1',
    players: '1',
    difficultyA: 'A',
    difficultyB: 'A',
  });

  /** Original cartridge choices represented by the menu form. @public */
  public readonly setupForm = form(this._setup);
  /** All twelve original Game Select variations. @public */
  public readonly variations = BreakoutVariations;
  /** Active selection, used to explain its rules in the template. @public */
  public readonly selectedVariation = computed(
    () =>
      BreakoutVariations.find((variation) => variation.id === Number(this._setup().variation)) ??
      BreakoutVariations[0],
  );
  /** Number of human players selected for the next match. @public */
  public readonly selectedPlayers = computed(() => Number(this._setup().players));
  /** Active menu or playfield. @public */
  public readonly screen = signal<BreakoutScreen>('intro');
  /** Current match lifecycle. @public */
  public readonly status = signal(this._snapshot.status);
  /** Team statistics shown at the end of the match. @public */
  public readonly teams = signal(this._snapshot.teams);
  /** Team currently taking its turn. @public */
  public readonly currentTeamIndex = signal(this._snapshot.currentTeamIndex);
  /** Statistics of the team currently playing. @public */
  public readonly currentTeam = computed(() => this.teams()[this.currentTeamIndex()]);
  /** Match winner, when determined. @public */
  public readonly winner = signal(this._snapshot.winner);
  /** Options of the match already in progress. @public */
  public readonly matchOptions = signal(this._snapshot.options);
  /** Whether a match has been started during this visit. @public */
  public readonly hasMatch = signal(false);
  /** Whether the preserved match can be continued. @public */
  public readonly canContinue = computed(() => this.hasMatch() && this.status() !== 'gameOver');
  /** Whether the current match uses an elapsed-time score. @public */
  public readonly timedMatch = computed(
    () => this.matchOptions().variation >= 5 && this.matchOptions().variation <= 8,
  );
  /** Whether the active team shares two half-field paddles. @public */
  public readonly pairedTurn = computed(
    () => (this.teams()[this.currentTeamIndex()]?.players.length ?? 1) === 2,
  );
  /** Sound preference for this visit. @public */
  public readonly soundMuted = signal(false);
  /** Whether the browser can draw the playfield. @public */
  public readonly screenAvailable = signal(true);
  /** Returns to the Arcade hub. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a new match with the menu selections. @public */
  public readonly newGameCommand = new Command(() => this.startMatch(this.selectedOptions()));
  /** Replays the last match with the same cartridge options. @public */
  public readonly rematchCommand = new Command(() => this.startMatch(this.matchOptions()));
  /** Preserves the match while opening its menu. @public */
  public readonly menuCommand = new Command(() => this.openMenu());
  /** Continues a preserved match. @public */
  public readonly resumeCommand = new Command(() => {
    if (this._game.snapshot.status === 'paused') this._game.togglePause();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Advances the simulation while the playfield is open. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.screen() !== 'game') return;
    this._game.step(elapsed);
    this.projectSnapshot();
  });
  /** Applies the currently active team's paddle or button input. @public */
  public readonly inputCommand = new Command<{ input: BreakoutInput; active: boolean }>((value) => {
    if (this.screen() !== 'game') return;
    this._game.setInput(value.input, value.active);
    this.projectSnapshot();
  });
  /** Moves the paddle under the pointer within its permitted field. @public */
  public readonly pointerCommand = new Command<number>((x) => {
    if (this.screen() !== 'game') return;
    this._game.movePointer(x);
    this.projectSnapshot();
  });
  /** Pauses safely when application focus is lost. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Releases held inputs when focus moves to a menu control. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Toggles pause without losing a ball or elapsed time. @public */
  public readonly togglePauseCommand = new Command(
    () => {
      this._game.togglePause();
      this.projectSnapshot();
    },
    computed(() => this.screen() === 'game' && this.status() !== 'gameOver'),
  );
  /** Enables or silences game sounds. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));
  /** Reports a missing drawing context. @public */
  public readonly screenUnavailableCommand = new Command(() => this.screenAvailable.set(false));

  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new BreakoutRenderer();
  private readonly _audio = new BreakoutAudio();
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _keyboardInputs = new Set<BreakoutInput>();
  private _pointerInput: BreakoutInput | undefined;
  private _controller: ArcadeCanvasController<BreakoutInput> | undefined;

  // #endregion

  // #region Ctor

  /** Owns the match and connects its canvas lifecycle, releasing resources on route exit. @public */
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
        isActive: () => this.screen() === 'game',
        onAdvance: (elapsed) => this.advanceFrameCommand.execute(elapsed),
        onDraw: (context, canvas) => {
          const snapshot = this.snapshot;
          this._renderer.draw(
            context,
            snapshot,
            canvas,
            this.screen() === 'game' ? 'game' : 'intro',
          );
          if (this.screen() === 'game') this._audio.update(snapshot);
          canvas.dataset['ballX'] = String(snapshot.ball.x);
          canvas.dataset['ballY'] = String(snapshot.ball.y);
          canvas.dataset['paddleX'] = String(snapshot.paddles[0]?.x ?? 0);
          canvas.dataset['paddles'] = JSON.stringify(snapshot.paddles);
          canvas.dataset['team'] = String(snapshot.currentTeamIndex);
          canvas.dataset['attachedPaddle'] = String(snapshot.ball.attachedPaddle);
        },
        onInput: (input, active) => {
          if (active) this._keyboardInputs.add(input);
          else this._keyboardInputs.delete(input);
          this.emitInput(input);
        },
        onReleaseInputs: () => {
          this._keyboardInputs.clear();
          this._pointerInput = undefined;
          this.releaseInputsCommand.execute();
        },
        onPause: () => this.pauseCommand.execute(),
        onTogglePause: () => this.togglePauseCommand.execute(),
        onAudioResume: () => this.enableAudio(),
        onAudioSuspend: () => this._audio.suspend(),
        onUnavailable: () => this.screenUnavailableCommand.execute(),
        onPointerMove: (x) => this.pointerCommand.execute(x),
        onPointerDown: (x) => {
          this.pointerCommand.execute(x);
          const previousInput = this._pointerInput;
          this._pointerInput =
            x >= 0.5 && this.snapshot.paddles.length === 2 ? 'secondFire' : 'fire';
          if (previousInput && previousInput !== this._pointerInput) this.emitInput(previousInput);
          this.emitInput(this._pointerInput);
        },
        onPointerUp: () => {
          const input = this._pointerInput;
          this._pointerInput = undefined;
          if (input) this.emitInput(input);
        },
      });
    });
    effect(() => this._audio.setMuted(this.soundMuted()));
    effect(() => {
      if (this.screen() !== 'game' || this.status() === 'paused') {
        this._controller?.releaseInputs();
        this.releaseInputsCommand.execute();
        this._audio.suspend();
      }
    });
    this._destroyRef.onDestroy(() => {
      this._destroyed = true;
      const dialog = this._activeMenuDialog;
      this._activeMenuDialog = undefined;
      dialog?.close(Cancel.none());
      this._controller?.dispose();
      this.releaseInputsCommand.execute();
      this._audio.dispose();
    });
  }

  // #endregion

  // #region Properties

  /** Last immutable frame for canvas rendering and sound. @public */
  public get snapshot(): IBreakoutSnapshot {
    return this._snapshot;
  }

  // #endregion

  // #region Methods

  /** Opens the setup dialog after the routed game view has attached. @public */
  public ngAfterViewInit(): void {
    this.showMenuDialog();
  }

  /** Returns keyboard focus to the playfield following a game action. @public */
  public focusScreen(): void {
    queueMicrotask(() => this._controller?.focus());
  }

  /** Unlocks sound only during an active game after a user gesture. @public */
  public enableAudio(): void {
    if (this.screen() === 'game' && this.status() !== 'paused') void this._audio.resume();
  }

  private emitInput(input: BreakoutInput): void {
    this.inputCommand.execute({
      input,
      active: this._keyboardInputs.has(input) || this._pointerInput === input,
    });
  }

  private selectedOptions(): IBreakoutOptions {
    const setup = this._setup();
    const players = Number(setup.players);
    return {
      variation: this.selectedVariation().id,
      players: players === 2 || players === 3 || players === 4 ? players : 1,
      difficultyA: setup.difficultyA === 'B' ? 'B' : 'A',
      difficultyB: setup.difficultyB === 'B' ? 'B' : 'A',
    };
  }

  private startMatch(options: IBreakoutOptions): void {
    this._game.newGame(options);
    this._matchRecorded = false;
    this.hasMatch.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  }

  private openMenu(): void {
    this._game.pause();
    this.screen.set('intro');
    this.projectSnapshot();
    this.showMenuDialog();
  }

  private projectSnapshot(): void {
    this._snapshot = this._game.snapshot;
    this.status.set(this._snapshot.status);
    this.teams.set(this._snapshot.teams);
    this.currentTeamIndex.set(this._snapshot.currentTeamIndex);
    this.winner.set(this._snapshot.winner);
    this.matchOptions.set(this._snapshot.options);
    if (this.hasMatch() && !this._matchRecorded && this._snapshot.status === 'gameOver') {
      this._matchRecorded = true;
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'breakout',
        completedAt: new Date().toISOString(),
        variation: this._snapshot.options.variation,
        winner: this._snapshot.winner,
        teams: this._snapshot.teams.map((team) => ({
          index: team.index,
          players: team.players,
          score: team.score,
          ballsRemaining: team.ballsRemaining,
          wallsCleared: team.wallsCleared,
          elapsedSeconds: team.elapsedSeconds,
        })),
      });
    }
  }

  private showMenuDialog(): void {
    if (this._activeMenuDialog || this._destroyed) return;
    const dialog = this._dialogService.show<IBreakoutMenuDialogData, BreakoutMenuDialogResult>(
      BreakoutMenuDialogView,
      {
        data: { canContinue: this.canContinue(), setup: { ...this._setup() } },
        hasBackdrop: true,
        backdropStrategy: 'own',
        clickOutsideToClose: false,
        pressEscapeToClose: true,
        size: { width: '50rem', height: '90dvh' },
        minSize: { width: '20rem' },
        maxSize: { width: '100vw', height: '100dvh' },
      },
    );
    this._activeMenuDialog = dialog;
    let accepted = false;
    let decision: BreakoutMenuDialogResult | undefined;
    dialog.closed.pipe(take(1)).subscribe((result) => {
      if (this._activeMenuDialog === dialog) this._activeMenuDialog = undefined;
      accepted = result.reason === 'positive';
      decision = result.result;
    });
    dialog.overlayRef
      .detachments()
      .pipe(take(1))
      .subscribe(() => {
        const applyDecision = (): void => {
          if (this._destroyed) return;
          if (!accepted || !decision) {
            if (this.canContinue()) {
              this.resumeCommand.execute();
              this.focusScreen();
            } else {
              this.backArcadeCommand.execute();
            }
            return;
          }
          if (decision.action === 'allGames') {
            this.backArcadeCommand.execute();
            return;
          }
          if (decision.action === 'continue') {
            this.resumeCommand.execute();
            this.focusScreen();
            return;
          }
          this._setup.set({ ...decision.setup });
          this.newGameCommand.execute();
          this.focusScreen();
        };
        const applyAfterPortalCleanup = (): void => {
          if (this._destroyed) return;
          if (dialog.overlayRef.overlayElement.childElementCount > 0) {
            requestAnimationFrame(applyAfterPortalCleanup);
            return;
          }
          applyDecision();
        };
        requestAnimationFrame(applyAfterPortalCleanup);
      });
  }

  // #endregion
}
