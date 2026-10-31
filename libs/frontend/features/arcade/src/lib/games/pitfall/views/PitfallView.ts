// #region Imports

import { DecimalPipe } from '@angular/common';
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
import { Router } from '@angular/router';
import {
  ButtonComponent,
  CardActionsComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  IconNameDirective,
  KBD_DEFAULT_PROPS,
  KbdComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, CommandDirective } from '@symphony/frontend-core';
import { ArcadeGodModeStore } from '../../../god-mode/ArcadeGodModeStore';
import { ArcadeLeaderboardStore } from '../../../leaderboard/ArcadeLeaderboardStore';
import { ArcadeCanvasController } from '../../shared/browser/ArcadeCanvasController';
import { PitfallAudio } from '../audio/PitfallAudio';
import { PitfallGame } from '../model/PitfallGame';
import type { IPitfallSnapshot } from '../model/IPitfallSnapshot';
import type { PitfallInput } from '../model/PitfallInput';
import type { PitfallStatus } from '../model/PitfallStatus';
import { PitfallRenderer } from '../rendering/PitfallRenderer';
import type { PitfallScreen } from './PitfallScreen';

// #endregion

const INPUTS: Readonly<Record<string, PitfallInput>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
};

/** Self-contained expedition, menus, shared result recording and browser lifecycle. @public */
@Component({
  selector: 'symphony-pitfall-view',
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    ButtonComponent,
    CardActionsComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    DecimalPipe,
    IconNameDirective,
    KbdComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    CommandDirective,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: KBD_DEFAULT_PROPS, useValue: { value: [] } }],
  templateUrl: './PitfallView.html',
  styleUrl: './PitfallView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PitfallView {
  // #region Fields

  private readonly _game = new PitfallGame();
  private readonly _godMode = inject(ArcadeGodModeStore);
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private _snapshot: IPitfallSnapshot = this._game.snapshot;
  private _runRecorded = false;
  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new PitfallRenderer();
  private readonly _audio = new PitfallAudio();
  private readonly _destroyRef = inject(DestroyRef);
  private _controller: ArcadeCanvasController<PitfallInput> | undefined;

  /** Active game or menu surface. @public */
  public readonly screen = signal<PitfallScreen>('intro');
  /** Current expedition lifecycle. @public */
  public readonly status = signal<PitfallStatus>(this._snapshot.status);
  /** Points earned in this expedition. @public */
  public readonly score = signal(this._snapshot.score);
  /** Remaining attempts. @public */
  public readonly lives = signal(this._snapshot.lives);
  /** Unique treasures recovered. @public */
  public readonly treasures = signal(this._snapshot.treasuresCollected);
  /** Current jungle scene. @public */
  public readonly room = signal(this._snapshot.room.index);
  /** Whole seconds remaining. @public */
  public readonly secondsRemaining = signal(Math.ceil(this._snapshot.timeRemaining));
  /** The cause of a completed expedition. @public */
  public readonly terminalReason = signal<IPitfallSnapshot['terminalReason']>(null);
  /** Whether an expedition has been opened in this visit. @public */
  public readonly hasExpedition = signal(false);
  /** An unfinished expedition can be continued from the title screen. @public */
  public readonly canContinue = computed(
    () => this.hasExpedition() && !['gameOver', 'won'].includes(this.status()),
  );
  /** Whether a drawing context could be created. @public */
  public readonly screenAvailable = signal(true);
  /** Player-selected sound preference for this visit. @public */
  public readonly soundMuted = signal(false);
  /** Returns to the Arcade selection. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a fresh expedition, awaiting directional input as on the cartridge. @public */
  public readonly newGameCommand = new Command(() => {
    this._game.startNewGame();
    this._runRecorded = false;
    this.hasExpedition.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  });
  /** Returns to the title while preserving the current expedition. @public */
  public readonly menuCommand = new Command(() => this.openMenu('intro'));
  /** Opens the controls and expedition rules. @public */
  public readonly instructionsCommand = new Command(() => this.openMenu('instructions'));
  /** Continues the preserved expedition. @public */
  public readonly resumeCommand = new Command(() => {
    if (this._game.snapshot.status === 'paused') this._game.togglePause();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Advances the simulation only while its playfield is open. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.screen() !== 'game') return;
    this._game.step(elapsed);
    this.projectSnapshot();
  });
  /** Presses or releases a game control. @public */
  public readonly inputCommand = new Command<{ input: PitfallInput; active: boolean }>((value) => {
    if (this.screen() !== 'game') return;
    this._game.setInput(value.input, value.active);
    this.projectSnapshot();
  });
  /** Suspends the expedition on focus loss. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Releases controls when another application surface gains focus. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Pauses or resumes the expedition. @public */
  public readonly togglePauseCommand = new Command(
    () => {
      this._game.togglePause();
      this.projectSnapshot();
    },
    computed(() => this.screen() === 'game' && !['gameOver', 'won'].includes(this.status())),
  );
  /** Enables or silences the original event sounds. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));
  /** Reports a missing browser drawing context. @public */
  public readonly screenUnavailableCommand = new Command(() => this.screenAvailable.set(false));

  // #endregion

  // #region Ctor

  /** Connects browser input and drawing to the command-owned simulation. @public */
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
          this._renderer.draw(
            context,
            this.snapshot,
            canvas,
            this.screen() === 'game' ? 'game' : 'intro',
          );
          if (this.screen() === 'game') this._audio.update(this.snapshot);
          canvas.dataset['playerX'] = String(this.snapshot.player.x);
          canvas.dataset['playerY'] = String(this.snapshot.player.y);
          canvas.dataset['pose'] = this.snapshot.player.pose;
        },
        onInput: (input, active) => this.inputCommand.execute({ input, active }),
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

  /** Last immutable frame, consumed by rendering and audio. @public */
  public get snapshot(): IPitfallSnapshot {
    return this._snapshot;
  }

  // #endregion

  // #region Methods

  /** Returns keyboard focus to the playfield after an explicit game action. @public */
  public focusScreen(): void {
    queueMicrotask(() => this._controller?.focus());
  }

  /** Unlocks browser audio following a user sound-button gesture. @public */
  public enableAudio(): void {
    if (this.screen() === 'game' && this.status() !== 'paused') void this._audio.resume();
  }

  private openMenu(screen: PitfallScreen): void {
    this._game.pause();
    this.screen.set(screen);
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    const snapshot = this._game.snapshot;
    this._snapshot = snapshot;
    this.status.set(snapshot.status);
    this.score.set(snapshot.score);
    this.lives.set(snapshot.lives);
    this.treasures.set(snapshot.treasuresCollected);
    this.room.set(snapshot.room.index);
    this.secondsRemaining.set(Math.ceil(snapshot.timeRemaining));
    this.terminalReason.set(snapshot.terminalReason);
    if (!this._runRecorded && (snapshot.status === 'gameOver' || snapshot.status === 'won')) {
      this._runRecorded = true;
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'pitfall',
        score: snapshot.score,
        treasures: snapshot.treasuresCollected,
        elapsedSeconds: Math.min(1200, snapshot.elapsed),
        completedAt: new Date().toISOString(),
        outcome: snapshot.status === 'won' ? 'completed' : 'lost',
      });
    }
  }

  // #endregion
}
