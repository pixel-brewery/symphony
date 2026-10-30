// #region Imports

import { getPongRebound } from './getPongRebound';
import type { IPongSnapshot } from './IPongSnapshot';
import type { IPongSoundEvent } from './IPongSoundEvent';
import type { PongInput } from './PongInput';
import { PongRules } from './PongRules';

// #endregion

const FRAME_SECONDS = (PongRules.lineClocks * PongRules.frameLines) / PongRules.clock;
const SERVE_FRAMES = Math.ceil(PongRules.serveSeconds / FRAME_SECONDS);

/** Frame-stepped original two-human Pong, including attract, automatic serves and the A6 contact quirk. @public */
export class PongGame {
  // #region Fields

  private _status: IPongSnapshot['status'] = 'attract';
  private _resumeStatus: 'serving' | 'playing' = 'serving';
  private _generation = 0;
  private _frame = 0;
  private _matchFrames = 0;
  private _accumulator = 0;
  private _scores: [number, number] = [0, 0];
  private _targetScore: 11 | 15 = 11;
  private _winner: 0 | 1 | null = null;
  private _paddles: [number, number] = [115, 115];
  private _x = PongRules.serveX as number;
  private _y = 100;
  private _direction: -1 | 1 = 1;
  private _vertical = 3;
  private _hits = 0;
  private _serveFrames = 0;
  private readonly _inputs = new Set<PongInput>();
  private _eventId = 0;
  private _events: IPongSoundEvent[] = [];

  // #endregion

  // #region Properties

  /** Current original-scale raster coordinates, with paddle tops and ball top-left positions. @public @readonly */
  public get snapshot(): IPongSnapshot {
    return {
      status: this._status,
      generation: this._generation,
      frame: this._frame,
      elapsedSeconds: this._matchFrames * FRAME_SECONDS,
      scores: [...this._scores],
      targetScore: this._targetScore,
      winner: this._winner,
      paddles: [...this._paddles],
      ball: {
        x: this._x,
        y: this._y,
        vx: this._direction * this.speed(),
        vy: this._vertical,
        visible:
          this._status !== 'serving' &&
          !(this._status === 'paused' && this._resumeStatus === 'serving'),
      },
      rallyHits: this._hits,
      serveFrames: this._serveFrames,
      soundEvents: this._events,
    };
  }

  // #endregion

  // #region Methods

  /** Inserts the browser equivalent of one coin; the operator switch chooses eleven or fifteen points. @public */
  public newGame(targetScore: 11 | 15 = 11): void {
    this._generation++;
    this._targetScore = targetScore === 15 ? 15 : 11;
    this._scores = [0, 0];
    this._winner = null;
    this._matchFrames = 0;
    this._accumulator = 0;
    this._events = [];
    this.releaseInputs();
    this.serve();
  }

  /** Applies independent digital replacements for the cabinet's two potentiometers. @public */
  public setInput(input: PongInput, active: boolean): void {
    if (!active) this._inputs.delete(input);
    else if (this._status === 'playing' || this._status === 'serving') this._inputs.add(input);
  }

  /** Places the paddle in the pointer's half of the screen; y is normalized from top to bottom. @public */
  public movePointer(x: number, y: number): void {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      (this._status !== 'playing' && this._status !== 'serving')
    )
      return;
    this._paddles[x < 0.5 ? 0 : 1] = this.clampPaddle(
      y * PongRules.height - PongRules.paddleHeight / 2,
    );
  }

  /** Releases host keys without moving either analog paddle. @public */
  public releaseInputs(): void {
    this._inputs.clear();
  }

  /** Suspends the current rally or serve delay without losing its phase. @public */
  public pause(): void {
    if (this._status !== 'playing' && this._status !== 'serving') return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this.releaseInputs();
  }

  /** Continues the preserved phase or pauses it. @public */
  public togglePause(): void {
    if (this._status === 'paused') this._status = this._resumeStatus;
    else this.pause();
  }

  /** Advances at the original field rate, retaining fractions and bounding background host gaps. @public */
  public step(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0 || this._status === 'paused') return;
    this._events = [];
    this._accumulator += Math.min(250, milliseconds) / 1000;
    while (this._accumulator + 1e-10 >= FRAME_SECONDS) {
      this._accumulator -= FRAME_SECONDS;
      this._frame++;
      this.advance();
    }
  }

  private advance(): void {
    const attract = this._status === 'attract' || this._status === 'gameOver';
    if (!attract) {
      this._matchFrames++;
      this._paddles[0] = this.clampPaddle(
        this._paddles[0] +
          (Number(this._inputs.has('leftDown')) - Number(this._inputs.has('leftUp'))) *
            PongRules.keyboardPixelsPerFrame,
      );
      this._paddles[1] = this.clampPaddle(
        this._paddles[1] +
          (Number(this._inputs.has('rightDown')) - Number(this._inputs.has('rightUp'))) *
            PongRules.keyboardPixelsPerFrame,
      );
    }
    this.moveVertical(!attract && this._status !== 'serving');
    if (this._status === 'serving') {
      if (--this._serveFrames === 0) this._status = 'playing';
      return;
    }
    const previousX = this._x;
    this._x += this._direction * (attract ? 1 : this.speed());
    if (attract) {
      if (this._x <= 0 || this._x >= PongRules.width - PongRules.ballSize) {
        this._x = Math.max(0, Math.min(PongRules.width - PongRules.ballSize, this._x));
        this._direction = this._direction === 1 ? -1 : 1;
      }
      return;
    }
    this.collidePaddle(previousX);
    if (this._x < 0 || this._x + PongRules.ballSize > PongRules.width) {
      const scorer = this._direction === 1 ? 0 : 1;
      this._scores[scorer]++;
      this.emit('score');
      if (this._scores[scorer] >= this._targetScore) {
        this._winner = scorer;
        this._status = 'gameOver';
        this._vertical = this._vertical < 0 ? -3 : 3;
        this.releaseInputs();
      } else this.serve();
    }
  }

  private moveVertical(audible: boolean): void {
    this._y += this._vertical;
    const bottom = PongRules.height - PongRules.ballSize;
    if (this._y < 0 || this._y > bottom) {
      this._y = this._y < 0 ? -this._y : 2 * bottom - this._y;
      this._vertical *= -1;
      if (audible) this.emit('wall');
    }
  }

  private collidePaddle(previousX: number): void {
    const player = this._direction === -1 ? 0 : 1;
    const paddleX = PongRules.paddleX[player];
    const near =
      player === 0
        ? previousX >= paddleX && this._x <= paddleX + PongRules.paddleWidth
        : previousX + PongRules.ballSize <= paddleX + PongRules.paddleWidth &&
          this._x + PongRules.ballSize >= paddleX;
    if (
      !near ||
      this._y + PongRules.ballSize <= this._paddles[player] ||
      this._y >= this._paddles[player] + PongRules.paddleHeight
    )
      return;
    const hitLine = Math.max(Math.floor(this._y), Math.floor(this._paddles[player]));
    this._vertical = getPongRebound(
      hitLine - this._paddles[player],
      hitLine - this._paddles[player === 0 ? 1 : 0],
    );
    this._direction = player === 0 ? 1 : -1;
    this._x = player === 0 ? paddleX + PongRules.paddleWidth : paddleX - PongRules.ballSize;
    this._hits = Math.min(12, this._hits + 1);
    this.emit('paddle');
  }

  private serve(): void {
    this._status = 'serving';
    this._hits = 0;
    this._x = PongRules.serveX;
    this._serveFrames = SERVE_FRAMES;
  }

  private speed(): number {
    return this._hits < 4 ? 1 : this._hits < 12 ? 2 : 3;
  }

  private clampPaddle(y: number): number {
    return Math.round(
      Math.max(PongRules.paddleTopGap, Math.min(PongRules.height - PongRules.paddleHeight, y)),
    );
  }

  private emit(kind: IPongSoundEvent['kind']): void {
    this._events.push({
      id: ++this._eventId,
      kind,
      frame: this._frame,
      line: kind === 'wall' ? 0 : (Math.floor(this._y) + 16) % 262,
      ballCounter: 252,
      verticalLoad: 10 - this._vertical,
    });
  }

  // #endregion
}
