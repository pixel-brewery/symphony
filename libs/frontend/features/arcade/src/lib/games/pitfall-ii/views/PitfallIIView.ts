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
import { PitfallIIAudio } from '../audio/PitfallIIAudio';
import { PitfallIIGame } from '../model/PitfallIIGame';
import type { IPitfallIISnapshot } from '../model/IPitfallIISnapshot';
import type { PitfallIIInput } from '../model/PitfallIIInput';
import { PitfallIIRenderer } from '../rendering/PitfallIIRenderer';
import type { PitfallIIScreen } from './PitfallIIScreen';

// #endregion

const INPUTS: Readonly<Record<string, PitfallIIInput>> = {
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
  selector: 'symphony-pitfall-ii-view',
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
  templateUrl: './PitfallIIView.html',
  styleUrl: './PitfallIIView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PitfallIIView {
  // #region Fields

  private readonly _game = new PitfallIIGame();
  private readonly _godMode = inject(ArcadeGodModeStore);
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private _snapshot: IPitfallIISnapshot = this._game.snapshot;
  private _runRecorded = false;
  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new PitfallIIRenderer();
  private readonly _audio = new PitfallIIAudio();
  private readonly _destroyRef = inject(DestroyRef);
  private _controller: ArcadeCanvasController<PitfallIIInput> | undefined;

  /** Active game or menu surface. @public */
  public readonly screen = signal<PitfallIIScreen>('intro');
  /** Current expedition lifecycle. @public */
  public readonly status = signal<IPitfallIISnapshot['status']>(this._snapshot.status);
  /** Points earned in this expedition. @public */
  public readonly score = signal(this._snapshot.score);
  /** Gold bars recovered. @public */
  public readonly goldCollected = signal(this._snapshot.goldCollected);
  /** Current cavern chamber. @public */
  public readonly room = signal(this._snapshot.chamber);
  /** Rescued companions and recovered expedition objectives. @public */
  public readonly objectives = signal(this._snapshot.objectives);
  /** Depth reached in the original cavern layout. @public */
  public readonly level = signal(this._snapshot.level);
  /** Whether an expedition has been opened in this visit. @public */
  public readonly hasExpedition = signal(false);
  /** An unfinished expedition can be continued from the title screen. @public */
  public readonly canContinue = computed(() => this.hasExpedition() && this.status() !== 'won');
  /** Whether a drawing context could be created. @public */
  public readonly screenAvailable = signal(true);
  /** Player-selected sound preference for this visit. @public */
  public readonly soundMuted = signal(false);
  /** Returns to the Arcade selection. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a fresh expedition, awaiting directional input as on the cartridge. @public */
  public readonly newGameCommand = new Command(() => {
    this._audio.reset();
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
  public readonly inputCommand = new Command<{ input: PitfallIIInput; active: boolean }>(
    (value) => {
      if (this.screen() !== 'game') return;
      this._game.setInput(value.input, value.active);
      this.projectSnapshot();
    },
  );
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
    computed(() => this.screen() === 'game' && this.status() !== 'won'),
  );
  /** Enables or silences the expedition music and event sounds. @public */
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
          canvas.dataset['cameraY'] = String(this.snapshot.camera.y);
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
  public get snapshot(): IPitfallIISnapshot {
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

  private openMenu(screen: PitfallIIScreen): void {
    this._game.pause();
    this.screen.set(screen);
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    const snapshot = this._game.snapshot;
    this._snapshot = snapshot;
    this.status.set(snapshot.status);
    this.score.set(snapshot.score);
    this.goldCollected.set(snapshot.goldCollected);
    this.room.set(snapshot.chamber);
    this.level.set(snapshot.level);
    this.objectives.set(snapshot.objectives);
    if (!this._runRecorded && snapshot.status === 'won') {
      this._runRecorded = true;
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'pitfall-ii',
        score: snapshot.score,
        goldCollected: snapshot.goldCollected,
        elapsedSeconds: snapshot.elapsed,
        completedAt: new Date().toISOString(),
        outcome: 'completed',
      });
    }
  }

  // #endregion
}
