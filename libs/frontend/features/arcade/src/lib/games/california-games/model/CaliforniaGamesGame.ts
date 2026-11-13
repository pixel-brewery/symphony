// #region Imports

import type { CaliforniaGamesEvent } from './CaliforniaGamesEvent';
import type { CaliforniaGamesInput } from './CaliforniaGamesInput';
import type { ICaliforniaGamesOptions } from './ICaliforniaGamesOptions';
import type { ICaliforniaGamesSnapshot } from './ICaliforniaGamesSnapshot';
import type { ICaliforniaGamesSoundEvent } from './ICaliforniaGamesSoundEvent';

// #endregion

const FRAME = 1000 / 60;
const EVENTS: readonly CaliforniaGamesEvent[] = ['bmx', 'surfing', 'half-pipe', 'foot-bag'];
const BMX_FRAMES = 90 * 60;
const SURFING_FRAMES = 90 * 60;
const HALF_PIPE_FRAMES = 75 * 60;
const FOOT_BAG_FRAMES = 90 * 60;
const BMX_TRACK_LENGTH = 2800;

type PlayerNumber = 1 | 2;
type Phase = ICaliforniaGamesSnapshot['phase'];
type Music = ICaliforniaGamesSnapshot['music'];
type SoundKind = ICaliforniaGamesSoundEvent['kind'];
type BmxObstacle = {
  readonly id: number;
  readonly distance: number;
  readonly lane: number;
  readonly kind: 'ramp' | 'log' | 'puddle' | 'cliff';
};

interface IBmxRiderState {
  readonly player: PlayerNumber;
  score: number;
  finished: boolean;
  lane: number;
  progress: number;
  speed: number;
  height: number;
  verticalVelocity: number;
  rotation: number;
  rotationVelocity: number;
  pose: 'ride' | 'air' | 'crash' | 'finish';
  crashes: number;
  crashFrames: number;
  finishFrame: number | null;
  lastObstacle: number;
}

interface IBmxState {
  readonly kind: 'bmx';
  timerFrames: number;
  readonly riders: IBmxRiderState[];
}

interface ISurfingPlayerState {
  readonly player: PlayerNumber;
  score: number;
  finished: boolean;
  x: number;
  angle: number;
  speed: number;
  wipeouts: number;
  rideFrames: number;
  tubeFrames: number;
  pose: 'waiting' | 'ride' | 'turn' | 'aerial' | 'wipeout' | 'finish';
  wipeoutFrames: number;
  turnFrames: number;
  lastDirection: -1 | 0 | 1;
  aerialTurns: number;
}

interface ISurfingState {
  readonly kind: 'surfing';
  timerFrames: number;
  wavePhase: number;
  pelicanX: number;
  readonly surfers: ISurfingPlayerState[];
}

interface IHalfPipePlayerState {
  readonly player: PlayerNumber;
  score: number;
  finished: boolean;
  position: number;
  velocity: number;
  rotation: number;
  rotationVelocity: number;
  falls: number;
  handplantFrames: number;
  pose: 'waiting' | 'skate' | 'kick-turn' | 'aerial' | 'handplant' | 'fall' | 'finish';
  fallFrames: number;
  aerialFrames: number;
  pumpedAtCenter: boolean;
}

interface IHalfPipeState {
  readonly kind: 'half-pipe';
  timerFrames: number;
  cameraScale: number;
  scaleDemoFrames: number;
  readonly skaters: IHalfPipePlayerState[];
}

type FootBagMove =
  | 'kick'
  | 'turn'
  | 'head'
  | 'catch'
  | 'heel-lift'
  | 'seagull'
  | 'trip'
  | 'half-axle'
  | 'full-axle'
  | 'horseshoe'
  | 'jester'
  | 'double-arch'
  | 'doda';

interface IFootBagPlayerState {
  readonly player: PlayerNumber;
  score: number;
  finished: boolean;
  x: number;
  bagX: number;
  bagY: number;
  bagVelocityX: number;
  bagVelocityY: number;
  combo: number;
  pose: 'ready' | 'run' | 'jump' | 'kick' | 'head' | 'catch' | 'trip' | 'finish';
  drops: number;
  lastMove: FootBagMove | null;
  repeatedMove: number;
  catchFrames: number;
  started: boolean;
  airborneFrames: number;
  turnedDuringFlight: boolean;
  seagullHit: boolean;
}

interface IFootBagState {
  readonly kind: 'foot-bag';
  timerFrames: number;
  seagullX: number;
  readonly playersState: IFootBagPlayerState[];
}

type EventState = IBmxState | ISurfingState | IHalfPipeState | IFootBagState;

/** Deterministic reconstruction of the four-event Atari Lynx California Games cartridge. @public */
export class CaliforniaGamesGame {
  // #region Fields

  private _status: ICaliforniaGamesSnapshot['status'] = 'running';
  private _phase: Phase = 'intro';
  private _resumePhase: Phase = 'playing';
  private _phaseFrame = 0;
  private _frame = 0;
  private _accumulator = 0;
  private _options: ICaliforniaGamesOptions = { players: 1 };
  private _selectedEventIndex = 0;
  private _currentEvent: CaliforniaGamesEvent | null = null;
  private _eventState: EventState | null = null;
  private _flipped = false;
  private _godMode = false;
  private _music: Music = 'silent';
  private _musicId = 0;
  private _soundId = 0;
  private _sounds: ICaliforniaGamesSoundEvent[] = [];
  private _resultId = 0;
  private _latestResults: { player: PlayerNumber; event: CaliforniaGamesEvent; score: number }[] =
    [];
  private _newHighScorePlayers: PlayerNumber[] = [];
  private readonly _highScores: Record<
    CaliforniaGamesEvent,
    { player: PlayerNumber; score: number }[]
  > = {
    bmx: [],
    surfing: [],
    'half-pipe': [],
    'foot-bag': [],
  };
  private readonly _held = new Map<PlayerNumber, Set<CaliforniaGamesInput>>([
    [1, new Set<CaliforniaGamesInput>()],
    [2, new Set<CaliforniaGamesInput>()],
  ]);
  private readonly _pressed = new Map<PlayerNumber, Set<CaliforniaGamesInput>>([
    [1, new Set<CaliforniaGamesInput>()],
    [2, new Set<CaliforniaGamesInput>()],
  ]);
  private _warningPlayed = false;

  // #endregion

  // #region Ctor

  /** Creates a game positioned at the Epyx opening sequence. @public */
  public constructor() {
    this.startNewGame();
  }

  // #endregion

  // #region Properties

  /** Returns a detached frame so renderers and audio cannot mutate the simulation. @public */
  public get snapshot(): ICaliforniaGamesSnapshot {
    return {
      status: this._status,
      phase: this._phase,
      frame: this._frame,
      players: this._options.players,
      selectedEvent: EVENTS[this._selectedEventIndex]!,
      currentEvent: this._currentEvent,
      flipped: this._flipped,
      godMode: this._godMode,
      countdown: this.countdown,
      music: this._music,
      musicId: this._musicId,
      resultId: this._resultId,
      latestResults: this._latestResults.map((result) => ({ ...result })),
      highScores: EVENTS.map((event) => ({
        event,
        entries: this._highScores[event].map((entry) => ({ ...entry })),
      })),
      newHighScorePlayers: [...this._newHighScorePlayers],
      eventState: this.eventSnapshot(),
      soundEvents: this._sounds.map((event) => ({ ...event })),
    };
  }

  private get countdown(): number {
    if (this._phase !== 'countdown') return 0;
    return Math.max(1, 3 - Math.floor(this._phaseFrame / 60));
  }

  // #endregion

  // #region Methods

  /** Restarts the cartridge while preserving its in-memory per-event top-three tables. @public */
  public startNewGame(options: ICaliforniaGamesOptions = { players: 1 }): void {
    this._options = { players: options.players === 2 ? 2 : 1 };
    this._status = 'running';
    this._phase = 'intro';
    this._resumePhase = 'playing';
    this._phaseFrame = 0;
    this._frame = 0;
    this._accumulator = 0;
    this._selectedEventIndex = 0;
    this._currentEvent = null;
    this._eventState = null;
    this._flipped = false;
    this._latestResults = [];
    this._newHighScorePlayers = [];
    this._warningPlayed = false;
    this.releaseInputs();
    this.setMusic('silent');
  }

  /** Sets one local player's Lynx control and records button edges exactly once. @public */
  public setInput(player: PlayerNumber, input: CaliforniaGamesInput, active: boolean): void {
    if (player > this._options.players) return;
    const held = this._held.get(player)!;
    if (active) {
      if (!held.has(input)) this._pressed.get(player)!.add(input);
      held.add(input);
    } else held.delete(input);
  }

  /** Releases all local controls after focus loss, navigation, or a pause. @public */
  public releaseInputs(): void {
    for (const inputs of this._held.values()) inputs.clear();
    for (const inputs of this._pressed.values()) inputs.clear();
  }

  /** Makes falls, crashes, drops, and wipeouts recover without ending an event. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
  }

  /** Applies the Lynx Pause key, including both original option-button chords. @public */
  public pressPause(): void {
    if (this.isPhysicallyHeld(1, 'option1')) {
      const options = this._options;
      this.startNewGame(options);
      this.enterPhase('title');
      return;
    }
    if (this.isPhysicallyHeld(1, 'option2')) {
      this._flipped = !this._flipped;
      this.releaseInputs();
      this.sound('menu-select');
      return;
    }
    this.togglePause();
  }

  /** Suspends or resumes the exact title, menu, event, or result phase. @public */
  public togglePause(): void {
    if (this._status === 'paused') {
      this._status = 'running';
      this._phase = this._resumePhase;
      return;
    }
    this._resumePhase = this._phase;
    this._status = 'paused';
    this.releaseInputs();
    this._accumulator = 0;
  }

  /** Advances the game at fixed 60 Hz with at most 250 milliseconds of catch-up. @public */
  public update(elapsedMilliseconds: number): void {
    if (this._status === 'paused') return;
    this._sounds = [];
    this._accumulator += Math.min(250, Math.max(0, elapsedMilliseconds));
    while (this._accumulator >= FRAME) {
      this._accumulator -= FRAME;
      this.stepFrame();
    }
  }

  /** Advances a single fixed frame; useful for hosts that already run a 60 Hz clock. @public */
  public step(): void {
    if (this._status === 'paused') return;
    this._sounds = [];
    this.stepFrame();
  }

  private stepFrame(): void {
    this._frame++;
    this._phaseFrame++;
    switch (this._phase) {
      case 'intro':
        if (this._phaseFrame >= 150 || this.anyPressed('a', 'b')) this.enterPhase('title');
        break;
      case 'title':
        if (this.anyPressed('a', 'b')) {
          this.sound('menu-select');
          this.enterPhase('menu');
        }
        break;
      case 'menu':
        this.stepMenu();
        break;
      case 'countdown':
        this.stepCountdown();
        break;
      case 'playing':
        this.stepEvent();
        break;
      case 'event-over':
        if (this._phaseFrame >= 105) this.enterPhase('high-scores');
        break;
      case 'high-scores':
        if (this._phaseFrame >= 30 && this.anyPressed('a', 'b')) {
          this.sound('menu-select');
          this._currentEvent = null;
          this._eventState = null;
          this.enterPhase('menu');
        }
        break;
    }
    this.clearPressed();
  }

  private stepMenu(): void {
    if (this.wasPressed(1, 'up')) {
      this._selectedEventIndex = (this._selectedEventIndex + EVENTS.length - 1) % EVENTS.length;
      this.sound('menu-move');
    }
    if (this.wasPressed(1, 'down')) {
      this._selectedEventIndex = (this._selectedEventIndex + 1) % EVENTS.length;
      this.sound('menu-move');
    }
    if (this.anyPressed('a', 'b')) {
      this.sound('menu-select');
      this.beginEvent(EVENTS[this._selectedEventIndex]!);
    }
  }

  private stepCountdown(): void {
    if (this._phaseFrame === 1 || this._phaseFrame === 61 || this._phaseFrame === 121)
      this.sound('countdown');
    if (this._phaseFrame >= 180) this.enterPhase('playing');
  }

  private beginEvent(event: CaliforniaGamesEvent): void {
    this._currentEvent = event;
    this._latestResults = [];
    this._newHighScorePlayers = [];
    this._warningPlayed = false;
    switch (event) {
      case 'bmx':
        this._eventState = this.createBmxState();
        break;
      case 'surfing':
        this._eventState = this.createSurfingState();
        break;
      case 'half-pipe':
        this._eventState = this.createHalfPipeState();
        break;
      case 'foot-bag':
        this._eventState = this.createFootBagState();
        break;
    }
    this.setMusic(event);
    this.enterPhase('countdown');
  }

  private stepEvent(): void {
    if (!this._eventState) return;
    switch (this._eventState.kind) {
      case 'bmx':
        this.stepBmx(this._eventState);
        break;
      case 'surfing':
        this.stepSurfing(this._eventState);
        break;
      case 'half-pipe':
        this.stepHalfPipe(this._eventState);
        break;
      case 'foot-bag':
        this.stepFootBag(this._eventState);
        break;
    }
  }

  private createBmxState(): IBmxState {
    return {
      kind: 'bmx',
      timerFrames: BMX_FRAMES,
      riders: this.playerNumbers().map((player) => ({
        player,
        score: 0,
        finished: false,
        lane: this._options.players === 2 ? (player === 1 ? -0.28 : 0.28) : 0,
        progress: 0,
        speed: 0,
        height: 0,
        verticalVelocity: 0,
        rotation: 0,
        rotationVelocity: 0,
        pose: 'ride',
        crashes: 0,
        crashFrames: 0,
        finishFrame: null,
        lastObstacle: -1,
      })),
    };
  }

  private stepBmx(state: IBmxState): void {
    state.timerFrames = Math.max(0, state.timerFrames - 1);
    this.playWarning(state.timerFrames);
    for (const rider of state.riders) this.stepBmxRider(rider);
    if (state.timerFrames === 0 || state.riders.every((rider) => rider.finished)) {
      for (const rider of state.riders) {
        if (!rider.finished) rider.finished = true;
        rider.pose = 'finish';
      }
      this.finishEvent();
    }
  }

  private stepBmxRider(rider: IBmxRiderState): void {
    if (rider.finished) return;
    if (rider.crashFrames > 0) {
      rider.crashFrames--;
      rider.speed = 0;
      rider.pose = 'crash';
      if (rider.crashFrames <= 35 && this.wasPressed(rider.player, 'a')) rider.crashFrames = 0;
      if (rider.crashFrames === 0) rider.pose = 'ride';
      return;
    }

    if (this.isHeld(rider.player, 'up')) rider.speed = Math.min(4.8, rider.speed + 0.045);
    else rider.speed = Math.max(0, rider.speed - 0.014);
    if (this.isHeld(rider.player, 'down')) rider.speed = Math.max(0, rider.speed - 0.09);
    if (this.isHeld(rider.player, 'left')) rider.lane = Math.max(-1, rider.lane - 0.028);
    if (this.isHeld(rider.player, 'right')) rider.lane = Math.min(1, rider.lane + 0.028);

    if (rider.height === 0 && this.wasPressed(rider.player, 'a')) {
      rider.height = 0.1;
      rider.verticalVelocity = 4.2;
      rider.pose = 'air';
      this.sound('jump');
    }
    if (rider.height > 0 && this.wasPressed(rider.player, 'b'))
      rider.rotationVelocity += rider.rotationVelocity < 0.3 ? 0.22 : 0.1;

    rider.progress += rider.speed;
    if (rider.height > 0) {
      rider.height += rider.verticalVelocity;
      rider.verticalVelocity -= 0.2;
      rider.rotation += rider.rotationVelocity;
      rider.rotationVelocity *= 0.992;
      if (rider.height <= 0) this.landBmxRider(rider);
    }

    for (const obstacle of this.bmxObstacles()) {
      if (obstacle.id === rider.lastObstacle) continue;
      if (rider.progress < obstacle.distance - rider.speed - 1) continue;
      if (rider.progress > obstacle.distance + 7) {
        rider.lastObstacle = obstacle.id;
        continue;
      }
      if (Math.abs(rider.lane - obstacle.lane) > (obstacle.kind === 'cliff' ? 0.52 : 0.28))
        continue;
      rider.lastObstacle = obstacle.id;
      if (obstacle.kind === 'ramp' && rider.height === 0) {
        rider.height = 0.1;
        rider.verticalVelocity = Math.max(4, rider.speed * 1.05);
        rider.pose = 'air';
        this.sound('jump');
      } else if (rider.height < (obstacle.kind === 'cliff' ? 17 : 7)) {
        this.crashBmxRider(rider);
      } else {
        rider.score += obstacle.kind === 'cliff' ? 50 : 20;
        this.sound('score');
      }
    }

    if (rider.progress >= BMX_TRACK_LENGTH) {
      rider.progress = BMX_TRACK_LENGTH;
      rider.finished = true;
      rider.finishFrame = this._frame;
      rider.pose = 'finish';
      const seconds = Math.ceil((this._eventState as IBmxState).timerFrames / 60);
      rider.score += seconds;
      rider.score += Math.floor(rider.score * 0.25);
      this.sound('finish');
    }
  }

  private landBmxRider(rider: IBmxRiderState): void {
    const rotations = Math.min(4, Math.floor(Math.abs(rider.rotation) / (Math.PI * 2)));
    const landingError = Math.abs(rider.rotation % (Math.PI * 2));
    if (!this._godMode && rotations > 0 && landingError > 1.5 && landingError < 4.8) {
      this.crashBmxRider(rider);
    } else {
      const awards = [0, 10, 50, 100, 200] as const;
      rider.score += awards[rotations]!;
      if (rotations > 0) this.sound('score');
      else this.sound('land');
      rider.height = 0;
      rider.verticalVelocity = 0;
      rider.rotation = 0;
      rider.rotationVelocity = 0;
      rider.pose = 'ride';
    }
  }

  private crashBmxRider(rider: IBmxRiderState): void {
    if (this._godMode) {
      rider.height = Math.max(8, rider.height);
      rider.verticalVelocity = Math.max(2, rider.verticalVelocity);
      return;
    }
    rider.crashes++;
    rider.crashFrames = 75;
    rider.speed = 0;
    rider.height = 0;
    rider.rotation = 0;
    rider.rotationVelocity = 0;
    rider.pose = 'crash';
    this.sound('crash');
  }

  private bmxObstacles(): readonly BmxObstacle[] {
    const kinds = ['ramp', 'log', 'puddle', 'cliff'] as const;
    return Array.from({ length: 18 }, (_, index) => ({
      id: index,
      distance: 180 + index * 142 + (index % 3) * 19,
      lane: ((index * 37) % 17) / 8 - 1,
      kind: kinds[index % kinds.length]!,
    }));
  }

  private createSurfingState(): ISurfingState {
    return {
      kind: 'surfing',
      timerFrames: SURFING_FRAMES,
      wavePhase: 0,
      pelicanX: 178,
      surfers: this.playerNumbers().map((player) => ({
        player,
        score: 0,
        finished: false,
        x: this._options.players === 2 ? (player === 1 ? 92 : 112) : 100,
        angle: 0,
        speed: 0,
        wipeouts: 0,
        rideFrames: 0,
        tubeFrames: 0,
        pose: 'waiting',
        wipeoutFrames: 0,
        turnFrames: 0,
        lastDirection: 0,
        aerialTurns: 0,
      })),
    };
  }

  private stepSurfing(state: ISurfingState): void {
    state.timerFrames = Math.max(0, state.timerFrames - 1);
    state.wavePhase += 0.035;
    if (state.timerFrames <= 15 * 60) state.pelicanX -= 0.55;
    if (state.pelicanX < -18) state.pelicanX = 178;
    this.playWarning(state.timerFrames);
    for (const surfer of state.surfers) this.stepSurfer(surfer, state);
    if (state.surfers.length === 2) {
      const [first, second] = state.surfers;
      if (
        first &&
        second &&
        first.pose !== 'waiting' &&
        second.pose !== 'waiting' &&
        Math.abs(first.x - second.x) < 5
      ) {
        first.x -= 3;
        second.x += 3;
        first.angle -= 0.12;
        second.angle += 0.12;
      }
    }
    if (state.timerFrames === 0 || state.surfers.every((surfer) => surfer.finished)) {
      for (const surfer of state.surfers) {
        surfer.finished = true;
        surfer.pose = 'finish';
      }
      this.finishEvent();
    }
  }

  private stepSurfer(surfer: ISurfingPlayerState, state: ISurfingState): void {
    if (surfer.finished) return;
    if (surfer.wipeoutFrames > 0) {
      surfer.wipeoutFrames--;
      surfer.pose = 'wipeout';
      if (surfer.wipeoutFrames === 0) {
        const limit = this._options.players === 2 ? 6 : 3;
        if (surfer.wipeouts >= limit && !this._godMode) {
          surfer.finished = true;
          surfer.pose = 'finish';
        } else {
          surfer.pose = 'waiting';
          surfer.angle = 0;
          surfer.x = 105;
        }
      }
      return;
    }
    if (surfer.pose === 'waiting') {
      if (this.wasPressed(surfer.player, 'a')) {
        surfer.pose = 'ride';
        surfer.speed = 1.1;
        this.sound('jump');
      }
      return;
    }

    const left = this.isHeld(surfer.player, 'left');
    const right = this.isHeld(surfer.player, 'right');
    const tight = this.isHeld(surfer.player, 'a');
    const direction: -1 | 0 | 1 = left === right ? 0 : left ? -1 : 1;
    if (direction !== 0) {
      surfer.angle += direction * (tight ? 0.045 : 0.026);
      surfer.turnFrames++;
      surfer.pose = 'turn';
      if (
        surfer.lastDirection !== 0 &&
        surfer.lastDirection !== direction &&
        surfer.turnFrames > 12
      ) {
        surfer.score += Math.min(120, 20 + surfer.turnFrames * 2);
        surfer.turnFrames = 0;
        this.sound('score');
      }
      surfer.lastDirection = direction;
    } else {
      surfer.angle *= 0.985;
      surfer.pose = 'ride';
    }
    surfer.speed =
      (tight ? 0.75 : 1.15 + Math.cos(surfer.angle) * 0.45) +
      (this.isHeld(surfer.player, 'b') ? 0.35 : 0);
    surfer.x += Math.cos(surfer.angle) * surfer.speed * 0.12 - 0.08;
    surfer.rideFrames++;
    if (surfer.rideFrames % 90 === 0) surfer.score += 10;

    const tubeEdge = 45 + Math.sin(state.wavePhase) * 9;
    if (surfer.x < tubeEdge + 12 && surfer.x > tubeEdge - 8) {
      surfer.tubeFrames++;
      if (surfer.tubeFrames % 30 === 0) {
        surfer.score += 25;
        this.sound('score');
      }
    }

    const crest = Math.sin(state.wavePhase + surfer.player * 0.7);
    if (crest > 0.92 && Math.abs(surfer.angle) > 0.72) {
      surfer.pose = 'aerial';
      surfer.aerialTurns += Math.abs(surfer.angle) * 0.055;
      if (surfer.aerialTurns >= 1) {
        const turns = Math.min(5, Math.floor(surfer.aerialTurns));
        surfer.score += turns === 4 ? 600 : turns === 5 ? 1200 : turns * 80;
        surfer.aerialTurns = 0;
        this.sound('score');
      }
    }

    if (Math.abs(surfer.angle) > 1.47 || surfer.x < 20 || surfer.x > 154) {
      if (this._godMode) {
        surfer.angle = Math.max(-1.2, Math.min(1.2, surfer.angle));
        surfer.x = Math.max(24, Math.min(150, surfer.x));
      } else {
        surfer.wipeouts++;
        surfer.wipeoutFrames = 85;
        surfer.pose = 'wipeout';
        this.sound('wipeout');
      }
    }
  }

  private createHalfPipeState(): IHalfPipeState {
    return {
      kind: 'half-pipe',
      timerFrames: HALF_PIPE_FRAMES,
      cameraScale: 1,
      scaleDemoFrames: 0,
      skaters: this.playerNumbers().map((player) => ({
        player,
        score: 0,
        finished: false,
        position: player === 1 ? 0.94 : -0.94,
        velocity: 0,
        rotation: 0,
        rotationVelocity: 0,
        falls: 0,
        handplantFrames: 0,
        pose: 'waiting',
        fallFrames: 0,
        aerialFrames: 0,
        pumpedAtCenter: false,
      })),
    };
  }

  private stepHalfPipe(state: IHalfPipeState): void {
    state.timerFrames = Math.max(0, state.timerFrames - 1);
    this.playWarning(state.timerFrames);
    if (this.playerNumbers().some((player) => this.wasPressed(player, 'option2')))
      state.scaleDemoFrames = 240;
    if (state.scaleDemoFrames > 0) {
      state.scaleDemoFrames--;
      state.cameraScale = 1.08 + Math.sin(state.scaleDemoFrames * 0.09) * 0.34;
    } else {
      const edge = Math.max(...state.skaters.map((skater) => Math.abs(skater.position)));
      state.cameraScale += (1.28 - edge * 0.26 - state.cameraScale) * 0.08;
    }
    for (const skater of state.skaters) this.stepSkater(skater);
    if (state.timerFrames === 0 || state.skaters.every((skater) => skater.finished)) {
      for (const skater of state.skaters) {
        skater.finished = true;
        skater.pose = 'finish';
      }
      this.finishEvent();
    }
  }

  private stepSkater(skater: IHalfPipePlayerState): void {
    if (skater.finished) return;
    if (skater.fallFrames > 0) {
      skater.fallFrames--;
      skater.pose = 'fall';
      if (skater.fallFrames === 0) {
        if (skater.falls >= 3 && !this._godMode) {
          skater.finished = true;
          skater.pose = 'finish';
        } else {
          skater.position = skater.player === 1 ? 0.94 : -0.94;
          skater.velocity = 0;
          skater.pose = 'waiting';
        }
      }
      return;
    }
    if (skater.pose === 'waiting') {
      if (this.wasPressed(skater.player, 'a') || this.wasPressed(skater.player, 'b')) {
        skater.velocity = skater.position > 0 ? -0.025 : 0.025;
        skater.pose = 'skate';
        this.sound('jump');
      }
      return;
    }

    if (
      skater.handplantFrames > 0 ||
      (Math.abs(skater.position) > 0.91 && this.isHeld(skater.player, 'b'))
    ) {
      if (this.isHeld(skater.player, 'b')) {
        skater.handplantFrames = Math.min(90, skater.handplantFrames + 1);
        skater.velocity = 0;
        skater.pose = 'handplant';
        return;
      }
      skater.score += 40 + skater.handplantFrames * 2;
      skater.velocity = skater.position > 0 ? -0.035 : 0.035;
      skater.handplantFrames = 0;
      skater.pose = 'skate';
      this.sound('score');
    }

    if (skater.aerialFrames > 0) {
      skater.aerialFrames--;
      skater.rotation += skater.rotationVelocity;
      skater.pose = 'aerial';
      if (skater.aerialFrames === 0) {
        const rotations = Math.floor(Math.abs(skater.rotation) / (Math.PI * 2));
        const error = Math.abs(skater.rotation % (Math.PI * 2));
        if (!this._godMode && error > 1.25 && error < 5.05) this.fallSkater(skater);
        else {
          skater.score += 60 + rotations * 140;
          skater.rotation = 0;
          skater.rotationVelocity = 0;
          skater.velocity = skater.position > 0 ? -0.04 : 0.04;
          skater.pose = 'skate';
          this.sound('land');
        }
      }
      return;
    }

    skater.velocity += -skater.position * 0.00135;
    if (Math.abs(skater.position) < 0.24) {
      if (this.isHeld(skater.player, 'up') && !skater.pumpedAtCenter) {
        skater.velocity *= 1.12;
        skater.score += 5;
        skater.pumpedAtCenter = true;
      }
      if (this.isHeld(skater.player, 'left')) skater.velocity -= 0.0007;
      if (this.isHeld(skater.player, 'right')) skater.velocity += 0.0007;
    } else skater.pumpedAtCenter = false;
    skater.position += skater.velocity;

    if (Math.abs(skater.position) > 0.72 && this.wasPressed(skater.player, 'a')) {
      if (Math.abs(skater.position) > 0.91 && skater.position * skater.velocity > 0) {
        skater.aerialFrames = 28;
        const turn = this.isHeld(skater.player, 'left') ? -1 : 1;
        skater.rotationVelocity = turn * 0.24;
        skater.pose = 'aerial';
        this.sound('jump');
        return;
      }
      skater.velocity =
        skater.position > 0 ? -Math.abs(skater.velocity) : Math.abs(skater.velocity);
      skater.score += 25;
      skater.pose = 'kick-turn';
      this.sound('score');
    } else skater.pose = 'skate';

    if (Math.abs(skater.position) >= 1) {
      skater.position = Math.sign(skater.position);
      if (!this._godMode && Math.abs(skater.velocity) > 0.062) this.fallSkater(skater);
      else skater.velocity = -skater.velocity * 0.94;
    }
  }

  private fallSkater(skater: IHalfPipePlayerState): void {
    if (this._godMode) {
      skater.rotation = 0;
      skater.rotationVelocity = 0;
      skater.velocity = skater.position > 0 ? -0.035 : 0.035;
      return;
    }
    skater.falls++;
    skater.fallFrames = 90;
    skater.rotation = 0;
    skater.rotationVelocity = 0;
    skater.pose = 'fall';
    this.sound('fall');
  }

  private createFootBagState(): IFootBagState {
    return {
      kind: 'foot-bag',
      timerFrames: FOOT_BAG_FRAMES,
      seagullX: 178,
      playersState: this.playerNumbers().map((player) => {
        const x = this._options.players === 2 ? (player === 1 ? 54 : 112) : 80;
        return {
          player,
          score: 0,
          finished: false,
          x,
          bagX: x,
          bagY: 86,
          bagVelocityX: 0,
          bagVelocityY: 0,
          combo: 0,
          pose: 'ready',
          drops: 0,
          lastMove: null,
          repeatedMove: 0,
          catchFrames: 0,
          started: false,
          airborneFrames: 0,
          turnedDuringFlight: false,
          seagullHit: false,
        };
      }),
    };
  }

  private stepFootBag(state: IFootBagState): void {
    state.timerFrames = Math.max(0, state.timerFrames - 1);
    this.playWarning(state.timerFrames);
    if (state.timerFrames <= 30 * 60) state.seagullX -= 0.42;
    if (state.seagullX < -18) state.seagullX = 178;
    for (const player of state.playersState) this.stepFootBagPlayer(player, state);
    if (state.timerFrames === 0) {
      for (const player of state.playersState) {
        player.finished = true;
        player.pose = 'finish';
      }
      this.finishEvent();
    }
  }

  private stepFootBagPlayer(player: IFootBagPlayerState, state: IFootBagState): void {
    if (player.finished) return;
    const horizontal =
      Number(this.isHeld(player.player, 'right')) - Number(this.isHeld(player.player, 'left'));
    if (horizontal !== 0) {
      player.x = Math.max(8, Math.min(152, player.x + horizontal * 1.15));
      player.pose = 'run';
    } else if (player.pose === 'run') player.pose = 'ready';

    if (this.wasPressed(player.player, 'up')) {
      player.airborneFrames = 28;
      player.pose = 'jump';
    }
    if (player.airborneFrames > 0) player.airborneFrames--;
    if (this.wasPressed(player.player, 'down') && player.started && !player.turnedDuringFlight) {
      player.turnedDuringFlight = true;
      this.awardFootBagMove(player, 'turn', 10);
    }

    if (this.wasPressed(player.player, 'b') && this._options.players === 2) {
      const opponent = state.playersState.find((candidate) => candidate.player !== player.player)!;
      if (Math.abs(opponent.x - player.x) < 28 && opponent.started) {
        player.pose = 'trip';
        opponent.bagVelocityX += opponent.x > player.x ? 0.8 : -0.8;
        this.awardFootBagMove(player, 'trip', 25);
      }
    }

    if (!player.started) {
      player.bagX = player.x;
      player.bagY = 86;
      if (this.wasPressed(player.player, 'a')) {
        player.started = true;
        this.kickFootBag(player);
      }
      return;
    }

    player.bagX += player.bagVelocityX;
    player.bagY += player.bagVelocityY;
    player.bagVelocityY += 0.105;
    player.bagVelocityX *= 0.994;

    const closeToBody = Math.abs(player.bagX - player.x) < 12;
    if (
      this.isHeld(player.player, 'a') &&
      !this.wasPressed(player.player, 'a') &&
      closeToBody &&
      player.bagVelocityY > 0 &&
      player.bagY > 45 &&
      player.bagY < 72
    ) {
      player.catchFrames++;
      player.bagX = player.x;
      player.bagY = 57;
      player.bagVelocityX = 0;
      player.bagVelocityY = 0;
      player.pose = 'catch';
      if (player.catchFrames === 1) this.awardFootBagMove(player, 'catch', 10);
    } else if (player.catchFrames > 0) {
      player.catchFrames = 0;
      player.bagVelocityY = -2.2;
    }

    if (this.wasPressed(player.player, 'a') && closeToBody && player.bagY > 42)
      this.kickFootBag(player);

    if (
      !player.seagullHit &&
      Math.abs(player.bagX - state.seagullX) < 6 &&
      player.bagY > 22 &&
      player.bagY < 42
    ) {
      player.seagullHit = true;
      player.bagVelocityX *= -1;
      player.bagVelocityY = -1.3;
      this.awardFootBagMove(player, 'seagull', 50);
    }
    if (Math.abs(state.seagullX - 178) < 1) player.seagullHit = false;

    if (player.bagY >= 89) {
      if (this._godMode) {
        player.bagY = 86;
        player.bagX = player.x;
        this.kickFootBag(player);
      } else {
        player.bagY = 86;
        player.bagX = player.x;
        player.bagVelocityX = 0;
        player.bagVelocityY = 0;
        player.combo = 0;
        player.repeatedMove = 0;
        player.lastMove = null;
        player.started = false;
        player.drops++;
        player.pose = 'ready';
        this.sound('fall');
      }
    }
  }

  private kickFootBag(player: IFootBagPlayerState): void {
    let move: FootBagMove = 'kick';
    let value = 5;
    const horizontal =
      Number(this.isHeld(player.player, 'right')) - Number(this.isHeld(player.player, 'left'));
    if (this.isHeld(player.player, 'up') && horizontal !== 0) {
      move = 'jester';
      value = 80;
      player.pose = 'head';
      player.bagVelocityY = -2.85;
    } else if (this.isHeld(player.player, 'up')) {
      move = 'head';
      value = 10;
      player.pose = 'head';
      player.bagVelocityY = -2.65;
    } else if (this.isHeld(player.player, 'down') && horizontal !== 0) {
      move = 'horseshoe';
      value = 90;
      player.pose = 'kick';
      player.bagVelocityY = -3.2;
    } else if (this.isHeld(player.player, 'down')) {
      move = 'heel-lift';
      value = 40;
      player.pose = 'kick';
      player.bagVelocityY = -3.1;
    } else if (horizontal !== 0 && player.airborneFrames > 0) {
      move = player.lastMove === 'full-axle' ? 'doda' : 'full-axle';
      value = move === 'doda' ? 160 : 100;
      player.pose = 'kick';
      player.bagVelocityY = -3.4;
    } else if (horizontal !== 0) {
      move = player.lastMove === 'half-axle' ? 'double-arch' : 'half-axle';
      value = move === 'double-arch' ? 120 : 60;
      player.pose = 'kick';
      player.bagVelocityY = -3.35;
    } else {
      player.pose = 'kick';
      player.bagVelocityY = -3.35;
    }
    player.bagVelocityX = horizontal * 0.7;
    player.bagX = player.x + horizontal * 3;
    player.started = true;
    player.turnedDuringFlight = false;
    this.awardFootBagMove(player, move, value);
    this.sound('kick');
  }

  private awardFootBagMove(player: IFootBagPlayerState, move: FootBagMove, value: number): void {
    player.repeatedMove = player.lastMove === move ? Math.min(3, player.repeatedMove + 1) : 1;
    const multiplier = player.repeatedMove;
    player.combo = Math.min(1000, player.combo + value * multiplier);
    player.score += player.combo;
    player.lastMove = move;
    this.sound('score');
  }

  private finishEvent(): void {
    if (!this._currentEvent || !this._eventState || this._phase !== 'playing') return;
    const scores = this.eventScores();
    this._latestResults = scores.map((entry) => ({ event: this._currentEvent!, ...entry }));
    this._newHighScorePlayers = [];
    for (const result of scores) {
      const table = this._highScores[this._currentEvent];
      const entry = { ...result };
      table.push(entry);
      table.sort((left, right) => right.score - left.score || left.player - right.player);
      const index = table.indexOf(entry);
      if (index < 3) this._newHighScorePlayers.push(result.player);
      table.splice(3);
    }
    this._resultId++;
    this.sound('finish');
    if (this._newHighScorePlayers.length > 0) this.sound('high-score');
    this.enterPhase('event-over');
  }

  private eventScores(): { player: PlayerNumber; score: number }[] {
    if (!this._eventState) return [];
    switch (this._eventState.kind) {
      case 'bmx':
        return this._eventState.riders.map(({ player, score }) => ({ player, score }));
      case 'surfing':
        return this._eventState.surfers.map(({ player, score }) => ({ player, score }));
      case 'half-pipe':
        return this._eventState.skaters.map(({ player, score }) => ({ player, score }));
      case 'foot-bag':
        return this._eventState.playersState.map(({ player, score }) => ({ player, score }));
    }
  }

  private eventSnapshot(): ICaliforniaGamesSnapshot['eventState'] {
    const state = this._eventState;
    if (!state) return null;
    switch (state.kind) {
      case 'bmx': {
        const leader = Math.max(0, ...state.riders.map((rider) => rider.progress));
        return {
          kind: 'bmx',
          timer: Math.ceil(state.timerFrames / 60),
          progress: leader,
          trackLength: BMX_TRACK_LENGTH,
          obstacles: this.bmxObstacles().map((obstacle) => ({ ...obstacle })),
          riders: state.riders.map((rider) => ({
            player: rider.player,
            score: rider.score,
            finished: rider.finished,
            x: 64 + rider.lane * 36,
            y: 77 - rider.height * 0.55,
            lane: rider.lane,
            progress: rider.progress,
            speed: rider.speed,
            height: rider.height,
            rotation: rider.rotation,
            pose: rider.pose,
            crashes: rider.crashes,
            finishFrame: rider.finishFrame,
          })),
        };
      }
      case 'surfing':
        return {
          kind: 'surfing',
          timer: Math.ceil(state.timerFrames / 60),
          wavePhase: state.wavePhase,
          pelicanX: state.pelicanX,
          surfers: state.surfers.map((surfer) => ({
            player: surfer.player,
            score: surfer.score,
            finished: surfer.finished,
            x: surfer.x,
            y: 65 - Math.sin(state.wavePhase + surfer.player * 0.7) * 16,
            angle: surfer.angle,
            speed: surfer.speed,
            wipeouts: surfer.wipeouts,
            rideFrames: surfer.rideFrames,
            tubeFrames: surfer.tubeFrames,
            pose: surfer.pose,
          })),
        };
      case 'half-pipe':
        return {
          kind: 'half-pipe',
          timer: Math.ceil(state.timerFrames / 60),
          cameraScale: state.cameraScale,
          skaters: state.skaters.map((skater) => ({
            player: skater.player,
            score: skater.score,
            finished: skater.finished,
            x: 80 + skater.position * 66,
            y: 88 - Math.abs(skater.position) * 46 - (skater.aerialFrames > 0 ? 12 : 0),
            velocity: skater.velocity,
            rotation: skater.rotation,
            falls: skater.falls,
            handplantFrames: skater.handplantFrames,
            pose: skater.pose,
          })),
        };
      case 'foot-bag':
        return {
          kind: 'foot-bag',
          timer: Math.ceil(state.timerFrames / 60),
          seagullX: state.seagullX,
          playersState: state.playersState.map((player) => ({
            player: player.player,
            score: player.score,
            finished: player.finished,
            x: player.x,
            bagX: player.bagX,
            bagY: player.bagY,
            bagVelocityX: player.bagVelocityX,
            bagVelocityY: player.bagVelocityY,
            combo: player.combo,
            pose: player.pose,
            drops: player.drops,
            lastMove: player.lastMove,
          })),
        };
    }
  }

  private enterPhase(phase: Phase): void {
    this._phase = phase;
    this._phaseFrame = 0;
    if (phase === 'title' || phase === 'menu') this.setMusic('title');
    else if (phase === 'high-scores') this.setMusic('high-scores');
  }

  private setMusic(music: Music): void {
    if (music === this._music) return;
    this._music = music;
    this._musicId++;
  }

  private playWarning(timerFrames: number): void {
    if (!this._warningPlayed && timerFrames <= 10 * 60) {
      this._warningPlayed = true;
      this.sound('time-warning');
    }
  }

  private sound(kind: SoundKind): void {
    this._sounds.push({ id: ++this._soundId, kind });
  }

  private playerNumbers(): PlayerNumber[] {
    return this._options.players === 2 ? [1, 2] : [1];
  }

  private isPhysicallyHeld(player: PlayerNumber, input: CaliforniaGamesInput): boolean {
    return this._held.get(player)!.has(input);
  }

  private isHeld(player: PlayerNumber, input: CaliforniaGamesInput): boolean {
    return this._held.get(player)!.has(this.flippedInput(input));
  }

  private wasPressed(player: PlayerNumber, input: CaliforniaGamesInput): boolean {
    return this._pressed.get(player)!.has(this.flippedInput(input));
  }

  private anyPressed(...inputs: readonly CaliforniaGamesInput[]): boolean {
    return this.playerNumbers().some((player) =>
      inputs.some((input) => this.wasPressed(player, input)),
    );
  }

  private flippedInput(input: CaliforniaGamesInput): CaliforniaGamesInput {
    if (!this._flipped) return input;
    switch (input) {
      case 'left':
        return 'right';
      case 'right':
        return 'left';
      case 'up':
        return 'down';
      case 'down':
        return 'up';
      default:
        return input;
    }
  }

  private clearPressed(): void {
    for (const inputs of this._pressed.values()) inputs.clear();
  }

  // #endregion
}
