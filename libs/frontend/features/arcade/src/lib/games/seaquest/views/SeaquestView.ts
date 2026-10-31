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
import { SeaquestAudio } from '../audio/SeaquestAudio';
import { SeaquestGame } from '../model/SeaquestGame';
import type { ISeaquestSnapshot } from '../model/ISeaquestSnapshot';
import type { SeaquestInput } from '../model/SeaquestInput';
import { SeaquestRenderer } from '../rendering/SeaquestRenderer';

// #endregion

const INPUTS: Readonly<Record<string, SeaquestInput>> = {
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

/** Self-contained Seaquest menus, command-owned simulation and browser lifecycle. @public */
@Component({
  selector: 'symphony-seaquest-view',
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    ButtonComponent,
    CardActionsComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    DecimalPipe,
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
    CommandDirective,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: KBD_DEFAULT_PROPS, useValue: { value: [] } }],
  templateUrl: './SeaquestView.html',
  styleUrl: './SeaquestView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeaquestView {
  // #region Fields

  private readonly _game = new SeaquestGame();
  private readonly _godMode = inject(ArcadeGodModeStore);
  private readonly _leaderboard = inject(ArcadeLeaderboardStore);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _canvas = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new SeaquestRenderer();
  private readonly _audio = new SeaquestAudio();
  private readonly _recorded = new Set<number>();
  private readonly _setup = signal({ players: '1', difficultyA: 'B', difficultyB: 'B' });
  private _snapshot = this._game.snapshot;
  private _controller: ArcadeCanvasController<SeaquestInput> | undefined;

  /** Active playfield or menu surface. @public */
  public readonly screen = signal<'intro' | 'instructions' | 'game'>('intro');
  /** Cartridge lifecycle stage. @public */
  public readonly status = signal<ISeaquestSnapshot['status']>(this._snapshot.status);
  /** Current player's total. @public */
  public readonly score = signal(0);
  /** Divers currently in the hold. @public */
  public readonly divers = signal(0);
  /** Remaining air in the original 64-unit gauge. @public */
  public readonly oxygen = signal(64);
  /** One-based completed-batch progression. @public */
  public readonly level = signal(1);
  /** Current alternating player. @public */
  public readonly player = signal<1 | 2>(1);
  /** Final and ongoing scores for each selected player. @public */
  public readonly players = signal(this._snapshot.players);
  /** Whether this visit has a resumable game. @public */
  public readonly hasGame = signal(false);
  /** Pending console switches apply only when starting a new game. @public */
  public readonly setupForm = form(this._setup);
  /** Selected number of alternating players. @public */
  public readonly selectedPlayers = computed(() => Number(this._setup().players));
  /** Whether the preserved game is unfinished. @public */
  public readonly canContinue = computed(
    () => this.hasGame() && this.status() !== 'gameOver' && this.status() !== 'completed',
  );
  /** Browser drawing availability. @public */
  public readonly screenAvailable = signal(true);
  /** Player-selected sound preference. @public */
  public readonly soundMuted = signal(false);
  /** Returns to the shared catalog. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a new game using the pending console switches. @public */
  public readonly newGameCommand = new Command(() => {
    const setup = this._setup();
    this._audio.reset();
    this._recorded.clear();
    this._game.newGame({
      players: setup.players === '2' ? 2 : 1,
      difficultyA: setup.difficultyA === 'A' ? 'A' : 'B',
      difficultyB: setup.difficultyB === 'A' ? 'A' : 'B',
    });
    this.hasGame.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  });
  /** Restarts with the current game's console settings. @public */
  public readonly resetCommand = new Command(() => {
    this._audio.reset();
    this._recorded.clear();
    this._game.newGame(this._snapshot.options);
    this.screen.set('game');
    this.projectSnapshot();
  });
  /** Preserves the game while opening its title and options. @public */
  public readonly menuCommand = new Command(() => this.openMenu('intro'));
  /** Opens the original rules and desktop controls. @public */
  public readonly instructionsCommand = new Command(() => this.openMenu('instructions'));
  /** Continues without changing the active console settings. @public */
  public readonly resumeCommand = new Command(() => {
    if (this._game.snapshot.status === 'paused') this._game.togglePause();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Advances only while the playfield is open. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.screen() !== 'game') return;
    this._game.step(elapsed);
    this.projectSnapshot();
  });
  /** Maps desktop controls onto the original joystick. @public */
  public readonly inputCommand = new Command<{ input: SeaquestInput; active: boolean }>((value) => {
    if (this.screen() !== 'game') return;
    this._game.setInput(value.input, value.active);
  });
  /** Suspends the active stage on focus loss. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Atomically cancels held controls. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Toggles pause while retaining exact simulation state. @public */
  public readonly togglePauseCommand = new Command(() => {
    this._game.togglePause();
    this.projectSnapshot();
  }, this.canContinue);
  /** Toggles both original audio channels. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));

  // #endregion

  // #region Ctor

  /** Connects the shared browser controller and releases it with the lazy route. @public */
  public constructor(router: Router) {
    this.backArcadeCommand = new Command(() => {
      this._game.pause();
      void router.navigate(['/main/arcade']);
    });
    effect(() => this._game.setGodMode(this._godMode.enabled()));
    effect(() => this._audio.setMuted(this.soundMuted()));
    effect(() => {
      const canvas = this._canvas();
      if (!canvas || this._controller) return;
      this._controller = new ArcadeCanvasController({
        canvas: canvas.nativeElement,
        inputs: INPUTS,
        isActive: () => this.screen() === 'game',
        onAdvance: (elapsed) => this.advanceFrameCommand.execute(elapsed),
        onDraw: (context, element) => {
          this._renderer.draw(
            context,
            this._snapshot,
            element,
            this.screen() === 'game' ? 'game' : 'intro',
          );
          if (this.screen() === 'game') this._audio.consume(this._snapshot.soundEvents);
          element.dataset['playerX'] = String(this._snapshot.player.x);
          element.dataset['playerY'] = String(this._snapshot.player.y);
        },
        onInput: (input, active) => this.inputCommand.execute({ input, active }),
        onReleaseInputs: () => this.releaseInputsCommand.execute(),
        onPause: () => this.pauseCommand.execute(),
        onTogglePause: () => this.togglePauseCommand.execute(),
        onAudioResume: () => this.enableAudio(),
        onAudioSuspend: () => this._audio.suspend(),
        onUnavailable: () => this.screenAvailable.set(false),
      });
    });
    effect(() => {
      if (this.screen() !== 'game' || this.status() === 'paused') {
        this._controller?.releaseInputs();
        this._audio.suspend();
      }
    });
    this._destroyRef.onDestroy(() => {
      this._controller?.dispose();
      this._game.releaseInputs();
      this._audio.dispose();
    });
  }

  // #endregion

  // #region Properties

  /** Last immutable frame for rendering and behavioral verification. @public */
  public get snapshot(): ISeaquestSnapshot {
    return this._snapshot;
  }

  // #endregion

  // #region Methods

  /** Restores playfield focus after a player command. @public */
  public focusScreen(): void {
    queueMicrotask(() => this._controller?.focus());
  }

  /** Unlocks sound only following a browser gesture. @public */
  public enableAudio(): void {
    if (this.screen() === 'game' && this.status() !== 'paused') void this._audio.resume();
  }

  private openMenu(screen: 'intro' | 'instructions'): void {
    this._game.pause();
    this.screen.set(screen);
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    const snapshot = this._game.snapshot;
    this._snapshot = snapshot;
    this.status.set(snapshot.status);
    this.score.set(snapshot.score);
    this.divers.set(snapshot.divers);
    this.oxygen.set(snapshot.oxygen);
    this.level.set(snapshot.level);
    this.player.set(snapshot.currentPlayer);
    this.players.set(snapshot.players);
    for (const player of snapshot.players) {
      if (!player.outcome || this._recorded.has(player.player)) continue;
      this._recorded.add(player.player);
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'seaquest',
        completedAt: new Date().toISOString(),
        score: player.score,
        level: player.level,
        player: player.player,
        elapsedSeconds: player.elapsedSeconds,
        outcome: player.outcome,
      });
    }
  }

  // #endregion
}
