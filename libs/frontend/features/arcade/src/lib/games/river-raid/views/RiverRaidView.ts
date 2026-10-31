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
import { RiverRaidAudio } from '../audio/RiverRaidAudio';
import { RiverRaidGame } from '../model/RiverRaidGame';
import type { IRiverRaidSnapshot } from '../model/IRiverRaidSnapshot';
import type { RiverRaidInput } from '../model/RiverRaidInput';
import { RiverRaidRenderer } from '../rendering/RiverRaidRenderer';
import type { RiverRaidScreen } from './RiverRaidScreen';

// #endregion

const INPUTS: Readonly<Record<string, RiverRaidInput>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'fire',
};

/** Self-contained flight, menus, shared result recording and browser lifecycle. @public */
@Component({
  selector: 'symphony-river-raid-view',
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
  templateUrl: './RiverRaidView.html',
  styleUrl: './RiverRaidView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiverRaidView {
  // #region Fields

  private readonly _game = new RiverRaidGame();
  private readonly _godMode = inject(ArcadeGodModeStore);
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private _snapshot: IRiverRaidSnapshot = this._game.snapshot;
  private readonly _recordedPlayers = new Set<number>();
  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new RiverRaidRenderer();
  private readonly _audio = new RiverRaidAudio();
  private readonly _destroyRef = inject(DestroyRef);
  private _controller: ArcadeCanvasController<RiverRaidInput> | undefined;

  /** Active game or menu surface. @public */
  public readonly screen = signal<RiverRaidScreen>('intro');
  /** Current flight lifecycle. @public */
  public readonly status = signal<IRiverRaidSnapshot['status']>(this._snapshot.status);
  /** Current points and selected pilot. @public */
  public readonly score = signal(this._snapshot.score);
  /** Remaining fuel as a unit fraction. @public */
  public readonly fuel = signal(this._snapshot.fuel);
  /** Pilot currently flying. @public */
  public readonly player = signal(this._snapshot.player);
  /** Current bridge section. @public */
  public readonly level = signal(this._snapshot.level);
  /** Completed pilot attempts. @public */
  public readonly results = signal(this._snapshot.results);
  /** Console game-select setting, applied by New game. @public */
  public readonly playerCount = signal<1 | 2>(1);
  /** Independent console difficulty switches, applied by New game. @public */
  public readonly difficulty = signal<readonly ['a' | 'b', 'a' | 'b']>(['b', 'b']);
  /** Selects a one- or two-player alternating game. @public */
  public readonly playersCommand = new Command<1 | 2>((count) => this.playerCount.set(count));
  /** Changes one console missile-guidance switch. @public */
  public readonly difficultyCommand = new Command<0 | 1>((player) => {
    const settings: ['a' | 'b', 'a' | 'b'] = [...this.difficulty()];
    settings[player] = settings[player] === 'a' ? 'b' : 'a';
    this.difficulty.set(settings);
  });
  /** Whether an flight has been opened in this visit. @public */
  public readonly hasFlight = signal(false);
  /** An unfinished flight can be continued from the title screen. @public */
  public readonly canContinue = computed(() => this.hasFlight() && this.status() !== 'ended');
  /** Whether a drawing context could be created. @public */
  public readonly screenAvailable = signal(true);
  /** Player-selected sound preference for this visit. @public */
  public readonly soundMuted = signal(false);
  /** Returns to the Arcade selection. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a fresh flight, awaiting directional input as on the cartridge. @public */
  public readonly newGameCommand = new Command(() => {
    this._audio.reset();
    this._game.startNewGame({ players: this.playerCount(), difficulty: this.difficulty() });
    this._recordedPlayers.clear();
    this.hasFlight.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  });
  /** Returns to the title while preserving the current flight. @public */
  public readonly menuCommand = new Command(() => this.openMenu('intro'));
  /** Opens the controls and flight rules. @public */
  public readonly instructionsCommand = new Command(() => this.openMenu('instructions'));
  /** Continues the preserved flight. @public */
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
  public readonly inputCommand = new Command<{ input: RiverRaidInput; active: boolean }>(
    (value) => {
      if (this.screen() !== 'game') return;
      this._game.setInput(value.input, value.active);
      this.projectSnapshot();
    },
  );
  /** Suspends the flight on focus loss. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Releases controls when another application surface gains focus. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Pauses or resumes the flight. @public */
  public readonly togglePauseCommand = new Command(
    () => {
      this._game.togglePause();
      this.projectSnapshot();
    },
    computed(() => this.screen() === 'game' && this.status() !== 'ended'),
  );
  /** Enables or silences the flight music and event sounds. @public */
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
          canvas.dataset['playerX'] = String(this.snapshot.x);
          canvas.dataset['distance'] = String(this.snapshot.bottom);
          canvas.dataset['missileX'] = String(this.snapshot.missile?.x ?? '');
          canvas.dataset['speed'] = String(this.snapshot.speed);
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
  public get snapshot(): IRiverRaidSnapshot {
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

  private openMenu(screen: RiverRaidScreen): void {
    this._game.pause();
    this.screen.set(screen);
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    const snapshot = this._game.snapshot;
    this._snapshot = snapshot;
    this.status.set(snapshot.status);
    this.score.set(snapshot.score);
    this.fuel.set(snapshot.fuel);
    this.player.set(snapshot.player);
    this.level.set(snapshot.level);
    this.results.set(snapshot.results);
    for (const result of snapshot.results) {
      if (this._recordedPlayers.has(result.player)) continue;
      this._recordedPlayers.add(result.player);
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'river-raid',
        ...result,
        completedAt: new Date().toISOString(),
      });
    }
  }

  // #endregion
}
