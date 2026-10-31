// #region Imports

import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
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
import { JungleHuntAudio } from '../audio/JungleHuntAudio';
import type { IJungleHuntSnapshot } from '../model/IJungleHuntSnapshot';
import { JungleHuntGame } from '../model/JungleHuntGame';
import type { JungleHuntInput } from '../model/JungleHuntInput';
import { JungleHuntRenderer } from '../rendering/JungleHuntRenderer';

// #endregion

const INPUTS: Readonly<Record<string, JungleHuntInput>> = {
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

/** Owns the four-stage adventure, menus and browser resources without a game presenter. @public */
@Component({
  selector: 'symphony-jungle-hunt-view',
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
  templateUrl: './JungleHuntView.html',
  styleUrl: './JungleHuntView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JungleHuntView {
  // #region Fields

  private readonly _game = new JungleHuntGame();
  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _renderer = new JungleHuntRenderer();
  private readonly _audio = new JungleHuntAudio();
  private _controller: ArcadeCanvasController<JungleHuntInput> | undefined;
  private _recorded = false;
  private readonly _leaderboard: ArcadeLeaderboardStore;

  /** Current menu or playfield. @public */
  public readonly screen = signal<'intro' | 'instructions' | 'game'>('intro');
  /** Last projected model frame. @public */
  public readonly state = signal<IJungleHuntSnapshot>(this._game.snapshot);
  /** GAME SELECT chooses one of the two original skill levels. @public */
  public readonly skill = signal<1 | 2>(1);
  /** Whether this visit has a preservable run. @public */
  public readonly hasGame = signal(false);
  /** Whether a paused run may be resumed. @public */
  public readonly canContinue = computed(
    () => this.hasGame() && this.state().status !== 'gameOver',
  );
  /** Whether a browser drawing context is available. @public */
  public readonly screenAvailable = signal(true);
  /** Sound preference for this route visit. @public */
  public readonly soundMuted = signal(false);
  /** Returns to the game catalog. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Starts a fresh run at the selected skill. @public */
  public readonly newGameCommand = new Command(() => {
    this._audio.reset();
    this._game.startNewGame({ skill: this.skill() });
    this._recorded = false;
    this.hasGame.set(true);
    this.screen.set('game');
    this.projectSnapshot();
  });
  /** Cycles the cartridge GAME SELECT positions for the next run. @public */
  public readonly selectSkillCommand = new Command(() =>
    this.skill.update((skill) => (skill === 1 ? 2 : 1)),
  );
  /** Opens the title while keeping a run available. @public */
  public readonly menuCommand = new Command(() => this.openMenu('intro'));
  /** Opens the controls and scoring rules. @public */
  public readonly instructionsCommand = new Command(() => this.openMenu('instructions'));
  /** Restores the current run and animation phase. @public */
  public readonly resumeCommand = new Command(() => {
    if (this._game.snapshot.status === 'paused') this._game.togglePause();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Finalizes and records an explicitly ended run. @public */
  public readonly endGameCommand = new Command(() => {
    this._game.endGame();
    this.screen.set('game');
    this.projectSnapshot();
  }, this.canContinue);
  /** Advances only while the game surface is open. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.screen() !== 'game') return;
    this._game.step(elapsed);
    this.projectSnapshot();
  });
  /** Routes physical joystick input to the simulation. @public */
  public readonly inputCommand = new Command<{ input: JungleHuntInput; active: boolean }>(
    (value) => {
      if (this.screen() === 'game') this._game.setInput(value.input, value.active);
    },
  );
  /** Clears held switches after losing input ownership. @public */
  public readonly releaseInputsCommand = new Command(() => this._game.releaseInputs());
  /** Pauses on loss of application focus. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pause();
    this.projectSnapshot();
  });
  /** Toggles pause without changing the underlying phase. @public */
  public readonly togglePauseCommand = new Command(
    () => {
      this._game.togglePause();
      this.projectSnapshot();
    },
    computed(() => this.screen() === 'game' && this.state().status !== 'gameOver'),
  );
  /** Toggles audio independently of gameplay. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));
  /** Reports an unavailable drawing context. @public */
  public readonly screenUnavailableCommand = new Command(() => this.screenAvailable.set(false));

  // #endregion

  // #region Ctor

  /** Connects shared browser, god-mode and score owners to the self-contained game. @public */
  public constructor(
    router: Router,
    leaderboard: ArcadeLeaderboardStore,
    godMode: ArcadeGodModeStore,
    destroyRef: DestroyRef,
  ) {
    this._leaderboard = leaderboard;
    this.backArcadeCommand = new Command(() => {
      this._game.pause();
      void router.navigate(['/main/arcade']);
    });
    effect(() => this._game.setGodMode(godMode.enabled()));
    effect(() => {
      const canvas = this._screen()?.nativeElement;
      if (!canvas || this._controller) return;
      this._controller = new ArcadeCanvasController({
        canvas,
        inputs: INPUTS,
        isActive: () => this.screen() === 'game',
        onAdvance: (elapsed) => this.advanceFrameCommand.execute(elapsed),
        onDraw: (context, surface) => {
          const snapshot = this.state();
          this._renderer.draw(
            context,
            snapshot,
            surface,
            this.screen() === 'game' ? 'game' : 'intro',
          );
          if (this.screen() === 'game' && snapshot.status !== 'paused')
            this._audio.update(snapshot);
          surface.dataset['playerX'] = String(snapshot.player.x);
          surface.dataset['playerY'] = String(snapshot.player.y);
          surface.dataset['pose'] = snapshot.player.pose;
          surface.dataset['stage'] = snapshot.stage;
          surface.dataset['vine'] = String(snapshot.player.vine ?? -1);
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
      if (this.screen() !== 'game' || this.state().status === 'paused') {
        this._controller?.releaseInputs();
        this._audio.suspend();
      }
    });
    destroyRef.onDestroy(() => {
      this._controller?.dispose();
      this._game.releaseInputs();
      this._audio.dispose();
    });
  }

  // #endregion

  // #region Properties

  /** Exposes the last immutable frame for rendering and acceptance checks. @public */
  public get snapshot(): IJungleHuntSnapshot {
    return this.state();
  }

  // #endregion

  // #region Methods

  /** Returns keyboard focus and gesture-based sound activation to the game. @public */
  public focusScreen(): void {
    queueMicrotask(() => this._controller?.focus());
  }

  /** Unlocks the Web Audio context in response to a user gesture. @public */
  public enableAudio(): void {
    if (this.screen() === 'game' && this.state().status !== 'paused') void this._audio.resume();
  }

  private openMenu(screen: 'intro' | 'instructions'): void {
    this._game.pause();
    this.screen.set(screen);
    this.projectSnapshot();
  }

  private projectSnapshot(): void {
    const snapshot = this._game.snapshot;
    this.state.set(snapshot);
    if (!this._recorded && snapshot.status === 'gameOver' && this.hasGame()) {
      this._recorded = true;
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'jungle-hunt',
        completedAt: new Date().toISOString(),
        score: snapshot.score,
        level: snapshot.level,
        player: 1,
        elapsedSeconds: snapshot.elapsed,
        outcome: snapshot.outcome ?? 'lost',
      });
    }
  }

  // #endregion
}
