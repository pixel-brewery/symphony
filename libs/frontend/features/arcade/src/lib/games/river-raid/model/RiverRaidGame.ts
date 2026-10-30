// #region Imports

import type { IRiverRaidActor } from './IRiverRaidActor';
import type { IRiverRaidOptions } from './IRiverRaidOptions';
import type { IRiverRaidResult } from './IRiverRaidResult';
import type { IRiverRaidSnapshot } from './IRiverRaidSnapshot';
import type { RiverRaidInput } from './RiverRaidInput';
import { RiverRaidSpritePatterns } from './RiverRaidSpritePatterns';
import { RiverRaidWorld } from './RiverRaidWorld';
import { riverRaidActorRows } from './riverRaidActorRows';

// #endregion

interface IPlayer {
  score: number;
  reserves: number;
  checkpoint: number;
  level: number;
  elapsed: number;
  finished: boolean;
}
interface IActor extends IRiverRaidActor {
  x: number;
  direction: -1 | 1;
  destroyed: boolean;
  explosion: number;
  moving: boolean;
  patrol: boolean;
}
const POINTS = { ship: 30, helicopter: 60, jet: 100, fuel: 80, house: 0, bridge: 500 } as const;
const FRAME_MS = 1000 / 60;

/** Fixed NTSC-frame River Raid simulation, including the original seeded river and console rules. @public */
export class RiverRaidGame {
  // #region Fields

  private readonly _world = new RiverRaidWorld();
  private readonly _inputs = new Set<RiverRaidInput>();
  private readonly _actors = new Map<number, IActor>();
  private _options: IRiverRaidOptions = { players: 1, difficulty: ['b', 'b'] };
  private _players: IPlayer[] = [];
  private _player = 0;
  private _status: IRiverRaidSnapshot['status'] = 'ready';
  private _resumeStatus: IRiverRaidSnapshot['status'] = 'ready';
  private _results: IRiverRaidResult[] = [];
  private _frame = 0;
  private _accumulator = 0;
  private _fuel = 65535;
  private _speed = 64;
  private _x = 76;
  private _bottom = -32;
  private _bank: -1 | 0 | 1 = 0;
  private _acceleration = 0;
  private _horizontalFraction = 0;
  private _verticalFraction = 0;
  private _missile: { x: number; y: number } | null = null;
  private _crashFrames = 0;
  private _flash = 0;
  private _refueling = false;
  private _random = 1;
  private _godMode = false;
  private _sound0 = 0;
  private _soundCount = 0;
  private _shotSound = 0;
  private _explosionSound = 0;
  private _audioFrames: IRiverRaidSnapshot['audioFrames'][number][] = [];
  private _sounds: readonly (readonly [number, number, number])[] = [
    [0, 0, 0],
    [0, 0, 0],
  ];

  // #endregion

  // #region Ctor

  /** Prepares the first river section without consuming fuel until a joystick action. @public */
  public constructor() {
    this.startNewGame();
  }

  // #endregion

  // #region Properties

  /** Returns detached actors and player state so consumers cannot mutate the simulation. @public */
  public get snapshot(): IRiverRaidSnapshot {
    this.ensureActors();
    const pilot = this.current();
    const first = Math.floor(this._bottom / 32);
    return {
      status: this._status,
      options: this._options,
      frame: this._frame,
      player: this._player === 0 ? 1 : 2,
      score: pilot.score,
      scores: this._players.map((p) => p.score),
      reserves: pilot.reserves,
      level: pilot.level,
      checkpoint: pilot.checkpoint,
      fuel: this._fuel / 65535,
      speed: this._speed,
      x: this._x,
      bank: this._bank,
      bottom: this._bottom,
      missile: this._missile ? { ...this._missile } : null,
      actors: [...this._actors.values()]
        .filter((a) => a.y >= this._bottom - 32 && a.y <= this._bottom + 192)
        .map((a) => ({ ...a })),
      blocks: Array.from({ length: 6 }, (_, index) => this._world.block(first + index)),
      refueling: this._refueling,
      flash: this._flash,
      elapsed: pilot.elapsed / 60,
      results: this._results.map((result) => ({ ...result })),
      sounds: this._sounds,
      audioFrames: this._audioFrames,
    };
  }

  // #endregion

  // #region Methods

  /** Resets both players, scores, river checkpoints and controls using the selected console switches. @public */
  public startNewGame(options: IRiverRaidOptions = this._options): void {
    this._options = { players: options.players, difficulty: [...options.difficulty] };
    this._players = Array.from({ length: options.players }, () => ({
      score: 0,
      reserves: 3,
      checkpoint: 0,
      level: 1,
      elapsed: 0,
      finished: false,
    }));
    this._player = 0;
    this._results = [];
    this._frame = 0;
    this._random = 1;
    this._accumulator = 0;
    this.resetFlight();
  }

  /** Applies one joystick contact; any contact launches a waiting replacement jet. @public */
  public setInput(input: RiverRaidInput, active: boolean): void {
    if (this._status === 'paused' || this._status === 'ended') return;
    if (active) this._inputs.add(input);
    else this._inputs.delete(input);
    if (active && this._status === 'ready') this._status = 'playing';
  }

  /** Clears held controls atomically on focus changes. @public */
  public releaseInputs(): void {
    this._inputs.clear();
    this._bank = 0;
    this._acceleration = 0;
    this._horizontalFraction = 0;
  }

  /** Preserves ready, flying or crash state when a menu or another window gains focus. @public */
  public pause(): void {
    if (this._status === 'paused' || this._status === 'ended') return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this.releaseInputs();
    this._accumulator = 0;
  }

  /** Resumes precisely the state that was paused. @public */
  public togglePause(): void {
    if (this._status === 'paused') this._status = this._resumeStatus;
    else this.pause();
  }

  /** Applies the shared session test mode without changing the scoring or terrain sequence. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
  }

  /** Advances at 60 Hz, bounding catch-up after a delayed browser frame. @public */
  public step(milliseconds: number): void {
    if (
      !Number.isFinite(milliseconds) ||
      milliseconds <= 0 ||
      this._status === 'paused' ||
      this._status === 'ready' ||
      this._status === 'ended'
    )
      return;
    this._accumulator += Math.min(250, milliseconds);
    while (this._accumulator + 0.000001 >= FRAME_MS) {
      this._accumulator -= FRAME_MS;
      this.tick();
      if (!this.canAdvance()) break;
    }
  }

  private canAdvance(): boolean {
    return this._status === 'playing' || this._status === 'crashed';
  }

  private current(): IPlayer {
    return this._players[this._player]!;
  }

  private resetFlight(): void {
    this._status = 'ready';
    this._fuel = 65535;
    this._x = 76;
    this._speed = 64;
    this._bottom = this.current().checkpoint - 32;
    this._verticalFraction = 0;
    this._missile = null;
    this._actors.clear();
    this._refueling = false;
    this._flash = 0;
    this._sound0 = this._soundCount = this._shotSound = this._explosionSound = 0;
    this._audioFrames = [];
    this._sounds = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    this.releaseInputs();
    this.ensureActors();
  }

  private ensureActors(): void {
    const first = Math.floor(this._bottom / 32);
    for (let index = first; index <= first + 5; index++) {
      if (index < 0 || this._actors.has(index)) continue;
      const block = this._world.block(index);
      this._actors.set(index, {
        id: index,
        ...block.object,
        y: index * 32 + 25,
        destroyed: block.road && index * 32 < this.current().checkpoint,
        explosion: 0,
        moving: false,
        patrol: false,
      });
    }
    for (const [id] of this._actors) if (id < first - 1) this._actors.delete(id);
  }

  private tick(): void {
    this._frame++;
    if (this._flash > 0) this._flash--;
    this._random = ((this._random << 1) | ((((this._random << 3) ^ this._random) >> 7) & 1)) & 255;
    for (const actor of this._actors.values()) if (actor.explosion > 0) actor.explosion--;
    if (this._status === 'crashed') {
      if (--this._crashFrames === 0) this.nextTurn();
      this.updateSound();
      return;
    }
    this.current().elapsed++;
    this.ensureActors();
    this.moveEnemies();
    this._refueling = false;
    if (!this.collisions()) {
      this.updateSound();
      return;
    }
    this._fuel = this._godMode ? 65535 : Math.max(0, this._fuel - 32);
    if (this._fuel === 0) {
      this.crash(2);
      this.updateSound();
      return;
    }
    this.movePlayer();
    this.moveMissile();
    this._verticalFraction += this._speed >= 254 ? 512 : this._speed * 2;
    const lines = Math.floor(this._verticalFraction / 256);
    this._verticalFraction %= 256;
    this._bottom += lines;
    if (this._missile) this._missile.y += lines;
    this.current().level = Math.max(
      this.current().level,
      Math.floor((this._bottom + 18) / 1024) + 1,
    );
    this.updateSound();
  }

  private movePlayer(): void {
    const direction = (this._inputs.has('right') ? 1 : 0) - (this._inputs.has('left') ? 1 : 0);
    this._bank = direction as -1 | 0 | 1;
    if (!direction) {
      this._acceleration = 0;
      this._horizontalFraction = 0;
    } else {
      this._acceleration = Math.min(256, this._acceleration + 8);
      this._horizontalFraction += this._acceleration;
      if (this._horizontalFraction >= 256) {
        this._horizontalFraction -= 256;
        this._x = Math.max(0, Math.min(152, this._x + direction));
      }
    }
    if (this._inputs.has('up')) this._speed = Math.min(254, this._speed + 2);
    else if (this._inputs.has('down')) this._speed = Math.max(64, this._speed - 2);
    else if (this._speed < 128) this._speed = Math.min(128, this._speed + 2);
    else if (this._speed > 128) this._speed = Math.max(128, this._speed - 2);
  }

  private moveEnemies(): void {
    const active = [...this._actors.values()].sort((a, b) => a.id - b.id);
    if (this._frame % 16 === 0) {
      let index = this._random & 7;
      if (index >= 5) index -= 5;
      const enemy = active[index];
      if (enemy) enemy.moving = true;
    }
    if (this.current().level === 1) return;
    for (const actor of active) {
      if (actor.destroyed) continue;
      if (actor.kind === 'jet') {
        actor.x = (actor.x + actor.direction + 160) % 160;
        continue;
      }
      if (
        (actor.kind !== 'ship' && actor.kind !== 'helicopter') ||
        !actor.moving ||
        this._frame % 2
      )
        continue;
      const hitLand = this.actorTouchesLand(actor);
      if (hitLand && !actor.patrol) actor.direction = actor.direction === 1 ? -1 : 1;
      actor.patrol = hitLand;
      actor.x += actor.direction;
    }
  }

  private actorTouchesLand(actor: IActor): boolean {
    const rows = riverRaidActorRows(actor, this._frame);
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < 8; x++) {
        if ((rows[y]! & (128 >> x)) === 0) continue;
        const pixelX = actor.x + (actor.direction === -1 ? 7 - x : x) * actor.scale;
        if (
          this._world.isLand(pixelX, actor.y - y) ||
          this._world.isLand(pixelX + actor.scale - 1, actor.y - y)
        )
          return true;
      }
    return false;
  }

  private collisions(): boolean {
    if (this._godMode) return true;
    const rows =
      this._bank === 0 ? RiverRaidSpritePatterns.JetStraight : RiverRaidSpritePatterns.JetMove;
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < 8; x++) {
        if ((rows[y]! & (128 >> x)) === 0) continue;
        const px = this._x + (this._bank < 0 ? 1 : 0) + (this._bank < 0 ? 7 - x : x);
        const py = this._bottom + 18 - y;
        if (this._world.isLand(px, py)) {
          this.crash(1);
          return false;
        }
        for (const actor of this._actors.values()) {
          if (actor.destroyed || actor.kind === 'house' || !this.actorPixel(actor, px, py))
            continue;
          if (actor.kind === 'fuel') this._refueling = true;
          else {
            if (actor.kind === 'bridge') this.current().checkpoint = (actor.id + 1) * 32;
            actor.destroyed = true;
            actor.explosion = 32;
            this.addScore(POINTS[actor.kind]);
            this.crash(1);
            return false;
          }
        }
      }
    if (this._refueling) {
      this._fuel = Math.min(65535, this._fuel + 512);
      const sound = this._fuel === 65535 ? 3 : 4;
      if (this._sound0 !== sound) {
        this._sound0 = sound;
        this._soundCount = 8;
      }
    }
    return true;
  }

  private actorPixel(actor: IActor, x: number, y: number): boolean {
    const row = Math.floor(actor.y - y);
    let column = Math.floor((x - actor.x) / actor.scale);
    if (column < 0 || column >= 8 || row < 0 || row >= 24) return false;
    if (actor.direction === -1 && actor.kind !== 'fuel') column = 7 - column;
    return ((riverRaidActorRows(actor, this._frame)[row] ?? 0) & (128 >> column)) !== 0;
  }

  private moveMissile(): void {
    if (!this._missile) {
      if (this._inputs.has('fire')) {
        this._missile = { x: this._x + 5, y: this._bottom + 20 };
        this._shotSound = 15;
      }
      return;
    }
    const missile = this._missile;
    if (this._options.difficulty[this._player] === 'b') missile.x = this._x + 5;
    for (let step = 0; step < 6; step++) {
      missile.y++;
      if (missile.y > this._bottom + 168 || this._world.isLand(missile.x, missile.y)) {
        this._missile = null;
        return;
      }
      for (const actor of this._actors.values()) {
        if (
          actor.destroyed ||
          actor.kind === 'house' ||
          !this.actorPixel(actor, missile.x, missile.y)
        )
          continue;
        actor.destroyed = true;
        actor.explosion = 48;
        this._explosionSound = 23;
        this._missile = null;
        if (actor.kind === 'bridge') {
          this._flash = 23;
          this.current().checkpoint = (actor.id + 1) * 32;
          this.current().level = Math.max(
            this.current().level,
            Math.floor(this.current().checkpoint / 1024) + 1,
          );
        }
        this.addScore(POINTS[actor.kind]);
        return;
      }
    }
  }

  private addScore(points: number): void {
    const pilot = this.current();
    const before = Math.floor(pilot.score / 10000);
    pilot.score = Math.min(1000000, pilot.score + points);
    pilot.reserves = Math.min(9, pilot.reserves + Math.floor(pilot.score / 10000) - before);
    if (pilot.score >= 1000000) this.finish('completed');
  }

  private crash(sound: number): void {
    if (this._status !== 'playing') return;
    this._status = 'crashed';
    this._crashFrames = 96;
    this._sound0 = sound;
    this._soundCount = sound === 1 ? 31 : 35;
    this._missile = null;
    this.releaseInputs();
    if (this.current().reserves === 0) this.finish('lost');
    else this.current().reserves--;
  }

  private finish(outcome: 'lost' | 'completed'): void {
    const pilot = this.current();
    if (pilot.finished) return;
    pilot.finished = true;
    this._results.push({
      player: this._player === 0 ? 1 : 2,
      score: pilot.score,
      level: pilot.level,
      elapsedSeconds: pilot.elapsed / 60,
      outcome,
    });
    this._status = 'crashed';
    this._crashFrames = 96;
    this._missile = null;
    this.releaseInputs();
  }

  private nextTurn(): void {
    const other = (this._player + 1) % this._players.length;
    if (!this._players[other]!.finished) this._player = other;
    else if (this.current().finished) {
      this._status = 'ended';
      this._sounds = [
        [0, 0, 0],
        [0, 0, 0],
      ];
      return;
    }
    this.resetFlight();
  }

  private updateSound(): void {
    let channel0: readonly [number, number, number] = [0, 0, 0];
    if (this._sound0 && this._soundCount > 0) {
      channel0 =
        this._sound0 <= 2
          ? [8, this._sound0 === 1 ? 28 : 8, Math.min(15, this._soundCount >> 1)]
          : [4, this._sound0 === 3 ? 15 : 31, this._soundCount];
      if (--this._soundCount === 0) this._sound0 = 0;
    } else if (this._status === 'playing') {
      channel0 = [
        8,
        31 - (this._speed >> 4),
        this._inputs.has('down') ? 4 : this._inputs.has('up') ? 7 : 5,
      ];
      if (this._fuel < 16384) {
        if (this._soundCount === 0) this._soundCount = 63;
        this._soundCount--;
        if (this._fuel < 1024) channel0 = [12, 31 - Math.floor(this._fuel / 64), 15];
        else if (this._soundCount >= 28) channel0 = [12, this._soundCount >> 1, 15];
      }
    }
    let channel1: readonly [number, number, number] = [0, 0, 0];
    if (this._explosionSound > 0) {
      channel1 = [8, (this._random | 24) & 31, Math.min(15, (this._explosionSound >> 1) + 4)];
      this._explosionSound--;
    } else if (this._shotSound > 0) channel1 = [12, 28 - this._shotSound, 8];
    if (this._shotSound > 0) this._shotSound--;
    this._sounds = [channel0, channel1];
    this._audioFrames = [
      ...this._audioFrames.slice(-31),
      { frame: this._frame, channels: this._sounds },
    ];
  }

  // #endregion
}
