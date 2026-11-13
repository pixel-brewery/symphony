// #region Imports

import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  Inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  TranslateDirective,
  ButtonComponent,
  CardActionsComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
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
import { CaliforniaGamesAudio } from '../audio/CaliforniaGamesAudio';
import { CaliforniaGamesGame } from '../model/CaliforniaGamesGame';
import type { CaliforniaGamesInput } from '../model/CaliforniaGamesInput';
import type { ICaliforniaGamesSnapshot } from '../model/ICaliforniaGamesSnapshot';
import { CaliforniaGamesRenderer } from '../rendering/CaliforniaGamesRenderer';

// #endregion

type CaliforniaGamesControl = `${1 | 2}:${CaliforniaGamesInput}`;

const INPUTS: Readonly<Record<string, CaliforniaGamesControl>> = {
  ArrowLeft: '1:left',
  ArrowRight: '1:right',
  ArrowUp: '1:up',
  ArrowDown: '1:down',
  KeyZ: '1:a',
  KeyX: '1:b',
  KeyQ: '1:option1',
  KeyE: '1:option2',
  KeyA: '2:left',
  KeyD: '2:right',
  KeyW: '2:up',
  KeyS: '2:down',
  KeyF: '2:a',
  KeyG: '2:b',
  KeyR: '2:option1',
  KeyT: '2:option2',
};

const EVENT_SECONDS = {
  bmx: 90,
  surfing: 90,
  'half-pipe': 75,
  'foot-bag': 90,
} as const;

const HEADER_CONTROL_TARGETS =
  'button, a, [role="button"], [role="switch"], mosaik-button, mosaik-toggle-switch';
const EDITABLE_OR_DIALOG_TARGETS =
  'input, textarea, select, [contenteditable], [role="dialog"], mosaik-searchbox, mosaik-text-box, mosaik-number-box, mosaik-select';

/** Owns the complete California Games cartridge flow and all browser resources. @public */
@Component({
  selector: 'symphony-california-games-view',
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    TranslateDirective,
    ButtonComponent,
    CardActionsComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    KbdComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    CommandDirective,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: KBD_DEFAULT_PROPS, useValue: { value: [] } }],
  templateUrl: './CaliforniaGamesView.html',
  styleUrl: './CaliforniaGamesView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaliforniaGamesView {
  // #region Fields

  private readonly _game = new CaliforniaGamesGame();
  private readonly _renderer = new CaliforniaGamesRenderer();
  private readonly _audio = new CaliforniaGamesAudio();
  private readonly _document: Document;
  private readonly _screen = viewChild<ElementRef<HTMLCanvasElement>>('playfieldCanvas');
  private readonly _leaderboard: ArcadeLeaderboardStore;
  private readonly _reroutedKeys = new Set<string>();
  private readonly _keyDownListener = (event: KeyboardEvent): void => this.onKeyDown(event);
  private readonly _keyUpListener = (event: KeyboardEvent): void => this.onKeyUp(event);
  private _controller: ArcadeCanvasController<CaliforniaGamesControl> | undefined;
  private _recordedResultId = 0;
  private _resumeAfterInstructions = false;

  /** Last immutable simulation frame. @public */
  public readonly state = signal<ICaliforniaGamesSnapshot>(this._game.snapshot);
  /** Configured number of local players for the next cartridge restart. @public */
  public readonly players = signal<1 | 2>(1);
  /** Whether the instructions temporarily cover the original playfield. @public */
  public readonly instructionsVisible = signal(false);
  /** Stable route-level screen state used by accessibility and acceptance checks. @public */
  public readonly screen = computed<'intro' | 'menu' | 'game' | 'instructions'>(() => {
    if (this.instructionsVisible()) return 'instructions';
    if (this.state().phase === 'intro' || this.state().phase === 'title') return 'intro';
    return this.state().phase === 'menu' ? 'menu' : 'game';
  });
  /** Whether the browser exposed a two-dimensional canvas context. @public */
  public readonly screenAvailable = signal(true);
  /** Sound preference for this route visit. @public */
  public readonly soundMuted = signal(false);
  /** Observable primary-player movement used by accessibility and acceptance checks. @public */
  public readonly controlMetric = computed(() => {
    const state = this.state().eventState;
    if (!state) return 0;
    switch (state.kind) {
      case 'bmx':
        return Math.round(state.riders[0]?.progress ?? 0);
      case 'surfing':
        return state.surfers[0]?.rideFrames ?? 0;
      case 'half-pipe':
        return Math.round(Math.abs(state.skaters[0]?.velocity ?? 0) * 10_000);
      case 'foot-bag':
        return state.playersState[0]?.score ?? 0;
    }
  });
  /** Observable primary-player pose used by accessibility and acceptance checks. @public */
  public readonly primaryPose = computed(() => {
    const state = this.state().eventState;
    if (!state) return 'none';
    switch (state.kind) {
      case 'bmx':
        return state.riders[0]?.pose ?? 'none';
      case 'surfing':
        return state.surfers[0]?.pose ?? 'none';
      case 'half-pipe':
        return state.skaters[0]?.pose ?? 'none';
      case 'foot-bag':
        return state.playersState[0]?.pose ?? 'none';
    }
  });
  /** Returns to the Arcade catalog. @public */
  public readonly backArcadeCommand: Command<void>;
  /** Restarts the original opening sequence for the configured number of players. @public */
  public readonly newGameCommand = new Command(() => {
    this._audio.reset();
    this._game.startNewGame({ players: this.players() });
    this._recordedResultId = this._game.snapshot.resultId;
    this._resumeAfterInstructions = false;
    this.instructionsVisible.set(false);
    this.projectSnapshot();
    this.focusScreen();
  });
  /** Switches between the documented one- and two-player Lynx configurations. @public */
  public readonly togglePlayersCommand = new Command(() => {
    this.players.update((players) => (players === 1 ? 2 : 1));
    this.newGameCommand.execute();
  });
  /** Opens the controls without advancing the cartridge. @public */
  public readonly instructionsCommand = new Command(() => {
    this._resumeAfterInstructions = this.state().status === 'running';
    if (this._resumeAfterInstructions) this._game.togglePause();
    this.instructionsVisible.set(true);
    this.projectSnapshot();
  });
  /** Closes the controls and returns to the preserved cartridge phase. @public */
  public readonly closeInstructionsCommand = new Command(() => {
    this.instructionsVisible.set(false);
    if (this._resumeAfterInstructions && this.state().status === 'paused') this._game.togglePause();
    this._resumeAfterInstructions = false;
    this.projectSnapshot();
    this.focusScreen();
  });
  /** Toggles the original Pause key behavior. @public */
  public readonly pauseCommand = new Command(() => {
    this._game.pressPause();
    this.projectSnapshot();
  });
  /** Advances only while the original playfield is visible. @public */
  public readonly advanceFrameCommand = new Command<number>((elapsed) => {
    if (this.instructionsVisible()) return;
    this._game.update(elapsed);
    this.projectSnapshot();
  });
  /** Routes one local player's Lynx control into the deterministic simulation. @public */
  public readonly inputCommand = new Command<{
    control: CaliforniaGamesControl;
    active: boolean;
  }>((value) => {
    const [player, input] = value.control.split(':') as [string, CaliforniaGamesInput];
    this._game.setInput(player === '1' ? 1 : 2, input, value.active);
  });
  /** Releases all held Lynx switches after focus loss or navigation. @public */
  public readonly releaseInputsCommand = new Command(() => {
    this._reroutedKeys.clear();
    this._game.releaseInputs();
  });
  /** Pauses without applying an option-button chord when application focus is lost. @public */
  public readonly focusLostCommand = new Command(() => {
    if (this.state().status === 'running') this._game.togglePause();
    this.projectSnapshot();
  });
  /** Toggles sound without changing any game timing. @public */
  public readonly toggleSoundCommand = new Command(() => this.soundMuted.update((muted) => !muted));
  /** Records that the browser could not construct the playfield. @public */
  public readonly screenUnavailableCommand = new Command(() => this.screenAvailable.set(false));

  // #endregion

  // #region Ctor

  /** Connects the self-contained game to navigation, scores, God mode and browser resources. @public */
  public constructor(
    @Inject(DOCUMENT) document: Document,
    router: Router,
    leaderboard: ArcadeLeaderboardStore,
    godMode: ArcadeGodModeStore,
    destroyRef: DestroyRef,
  ) {
    this._document = document;
    this._leaderboard = leaderboard;
    this._document.addEventListener('keydown', this._keyDownListener, true);
    this._document.addEventListener('keyup', this._keyUpListener, true);
    this.backArcadeCommand = new Command(() => {
      if (this._game.snapshot.status === 'running') this._game.togglePause();
      void router.navigate(['/main/arcade']);
    });
    effect(() => this._game.setGodMode(godMode.enabled()));
    effect(() => {
      const canvas = this._screen()?.nativeElement;
      if (!canvas || this._controller) return;
      this._controller = new ArcadeCanvasController({
        canvas,
        inputs: INPUTS,
        isActive: () => !this.instructionsVisible(),
        onAdvance: (elapsed) => this.advanceFrameCommand.execute(elapsed),
        onDraw: (context, surface) => {
          const snapshot = this.state();
          this._renderer.draw(context, snapshot, surface);
          this._audio.update(snapshot);
          surface.dataset['phase'] = snapshot.phase;
          surface.dataset['event'] = snapshot.currentEvent ?? snapshot.selectedEvent;
          surface.dataset['flipped'] = String(snapshot.flipped);
        },
        onInput: (control, active) => this.inputCommand.execute({ control, active }),
        onReleaseInputs: () => this.releaseInputsCommand.execute(),
        onPause: () => this.focusLostCommand.execute(),
        onTogglePause: () => this.pauseCommand.execute(),
        onAudioResume: () => this.enableAudio(),
        onAudioSuspend: () => this._audio.suspend(),
        onUnavailable: () => this.screenUnavailableCommand.execute(),
      });
    });
    effect(() => this._audio.setMuted(this.soundMuted()));
    effect(() => {
      if (this.instructionsVisible() || this.state().status === 'paused') {
        this._controller?.releaseInputs();
        this._audio.suspend();
      }
    });
    destroyRef.onDestroy(() => {
      this._document.removeEventListener('keydown', this._keyDownListener, true);
      this._document.removeEventListener('keyup', this._keyUpListener, true);
      this._controller?.dispose();
      this._game.releaseInputs();
      this._audio.dispose();
    });
  }

  // #endregion

  // #region Properties

  /** Exposes the last immutable game frame for acceptance tests. @public */
  public get snapshot(): ICaliforniaGamesSnapshot {
    return this.state();
  }

  // #endregion

  // #region Methods

  /** Gives the playfield keyboard focus and unlocks browser audio after a gesture. @public */
  public focusScreen(): void {
    if (this._controller) {
      this._controller.focus();
      return;
    }
    queueMicrotask(() => this._controller?.focus());
  }

  /** Resumes Web Audio only while the cartridge is visible and running. @public */
  public enableAudio(): void {
    if (!this.instructionsVisible() && this.state().status === 'running') void this._audio.resume();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      this.instructionsVisible() ||
      !this.shouldReroute(event)
    )
      return;
    const control = INPUTS[event.code];
    const pause = event.code === 'KeyP' || event.code === 'Escape';
    if (control === undefined && !pause) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pause) {
      this.pauseCommand.execute();
      this.focusScreen();
      return;
    }
    if (control === undefined) return;
    if (this._reroutedKeys.has(event.code)) return;
    this._reroutedKeys.add(event.code);
    this.inputCommand.execute({ control, active: true });
    this.enableAudio();
    this.focusScreen();
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (!this._reroutedKeys.delete(event.code)) return;
    const control = INPUTS[event.code];
    if (control === undefined) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.inputCommand.execute({ control, active: false });
  }

  private shouldReroute(event: Event): boolean {
    const elements = event
      .composedPath()
      .filter((target): target is Element => target instanceof Element);
    if (elements.some((target) => target.matches(EDITABLE_OR_DIALOG_TARGETS))) return false;
    return elements.some((target) => target.matches(HEADER_CONTROL_TARGETS));
  }

  private projectSnapshot(): void {
    const snapshot = this._game.snapshot;
    this.state.set(snapshot);
    if (snapshot.resultId === this._recordedResultId) return;
    this._recordedResultId = snapshot.resultId;
    const event = snapshot.latestResults[0]?.event;
    if (!event) return;
    const state = snapshot.eventState;
    const timer = state?.timer ?? 0;
    const elapsedSeconds = Math.max(0, EVENT_SECONDS[event] - timer);
    for (const result of snapshot.latestResults)
      this._leaderboard.add({
        id: crypto.randomUUID(),
        game: 'california-games',
        completedAt: new Date().toISOString(),
        event: result.event,
        score: result.score,
        player: result.player,
        players: snapshot.players,
        elapsedSeconds,
      });
  }

  // #endregion
}
