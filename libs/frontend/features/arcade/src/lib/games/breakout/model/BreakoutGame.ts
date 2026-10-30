// #region Imports

import type { BreakoutInput } from './BreakoutInput';
import type { BreakoutStatus } from './BreakoutStatus';
import { BreakoutVariations } from './BreakoutVariations';
import type { IBreakoutOptions } from './IBreakoutOptions';
import type { IBreakoutSnapshot } from './IBreakoutSnapshot';

// #endregion

interface ITeam {
  players: number[];
  score: number;
  ballsLost: number;
  wallsCleared: number;
  elapsedFrames: number;
  finished: boolean;
  bricks: boolean[];
  paddles: number[];
}

const DEFAULT_OPTIONS: IBreakoutOptions = {
  variation: 1,
  players: 1,
  difficultyA: 'A',
  difficultyB: 'A',
};
const FRAME_MS = 1000 / 60;
const WALL_LEFT = 4;
const WALL_RIGHT = 156;
const CEILING_Y = 20;
const PADDLE_Y = 176;
const BALL_RADIUS = 1;
const BASE_SPEED = 72;
const FAST_SPEED = 112;
const ROW_POINTS = [7, 7, 4, 4, 1, 1] as const;

/**
 * Original Atari-2600 Breakout's twelve rulesets and alternating one-to-four-player teams.
 * Motion is a deterministic 60 Hz browser reconstruction; undocumented numeric timings
 * and rebound slopes are explicitly recorded in this game's README.
 *
 * @public
 */
export class BreakoutGame {
  // #region Fields

  private _options: IBreakoutOptions = DEFAULT_OPTIONS;
  private _status: BreakoutStatus = 'ready';
  private _resumeStatus: 'ready' | 'playing' = 'ready';
  private _teams: ITeam[] = [];
  private _currentTeam = 0;
  private _winner: number | 'tie' | null = null;
  private _frame = 0;
  private _accumulator = 0;
  private _inputs = new Set<BreakoutInput>();
  private _ball = { x: 80, y: PADDLE_Y - BALL_RADIUS - 1, vx: 0, vy: 0 };
  private _attachedPaddle: number | null = 0;
  private _catchOffset = 0;
  private _consecutiveHits = 0;
  private _fast = false;
  private _lastPaddle = 0;
  private _steerDelta = 0;
  private _revealUntilFrame = 0;
  private _soundId = 0;
  private _soundEvents: Array<IBreakoutSnapshot['soundEvents'][number]> = [];
  private _godMode = false;

  // #endregion

  // #region Ctor

  /** Creates the original single-player, standard-paddle game selection. @public */
  public constructor() {
    this.newGame(DEFAULT_OPTIONS);
  }

  // #endregion

  // #region Properties

  /** Complete immutable state for drawing, controls and match results. @public @readonly */
  public get snapshot(): IBreakoutSnapshot {
    const team = this.currentTeam();
    const variation = BreakoutVariations[this._options.variation - 1] ?? BreakoutVariations[0];
    return {
      status: this._status,
      options: { ...this._options },
      currentTeamIndex: this._currentTeam,
      winner: this._winner,
      frame: this._frame,
      ballNumber: Math.min(5, team.ballsLost + 1),
      consecutiveHits: this._consecutiveHits,
      wallVisible:
        !variation.invisible || this._frame < this._revealUntilFrame || this._status === 'gameOver',
      teams: this._teams.map((value, index) => ({
        index,
        players: [...value.players],
        score: value.score,
        ballsLost: value.ballsLost,
        ballsRemaining: Math.max(0, 5 - value.ballsLost),
        wallsCleared: value.wallsCleared,
        elapsedSeconds: value.elapsedFrames / 60,
        finished: value.finished,
        brickMask: [...value.bricks],
      })),
      paddles: team.paddles.map((center, index) => ({
        x: center - this.paddleWidth() / 2,
        y: PADDLE_Y,
        width: this.paddleWidth(),
        height: 3,
        playerNumber: team.players[index] ?? 1,
        region: team.paddles.length === 1 ? 'whole' : index === 0 ? 'left' : 'right',
      })),
      ball: { ...this._ball, radius: BALL_RADIUS, attachedPaddle: this._attachedPaddle },
      bricks: team.bricks.map((alive, id) => ({
        id,
        row: Math.floor(id / 18),
        column: id % 18,
        x: 8 + (id % 18) * 8,
        y: 36 + Math.floor(id / 18) * 5,
        width: 7,
        height: 4,
        alive,
      })),
      soundEvents: this._soundEvents.map((event) => ({ ...event })),
    };
  }

  // #endregion

  // #region Methods

  /**
   * Resets both teams, their private walls and five-ball allocations.
   * @param options - Original Game Select and difficulty-switch choices.
   * @public
   */
  public newGame(options: IBreakoutOptions): void {
    this._options = {
      variation: Math.max(1, Math.min(12, Math.trunc(options.variation) || 1)),
      players: ([1, 2, 3, 4].includes(options.players) ? options.players : 1) as 1 | 2 | 3 | 4,
      difficultyA: options.difficultyA === 'B' ? 'B' : 'A',
      difficultyB: options.difficultyB === 'B' ? 'B' : 'A',
    };
    const groups =
      this._options.players === 1
        ? [[1]]
        : this._options.players === 2
          ? [[1], [2]]
          : this._options.players === 3
            ? [[1, 2], [3]]
            : [
                [1, 2],
                [3, 4],
              ];
    this._teams = groups.map((players) => ({
      players,
      score: 0,
      ballsLost: 0,
      wallsCleared: 0,
      elapsedFrames: 0,
      finished: false,
      bricks: Array.from({ length: 108 }, () => true),
      paddles: players.length === 1 ? [80] : [40, 120],
    }));
    this._currentTeam = 0;
    this._winner = null;
    this._frame = 0;
    this._accumulator = 0;
    this._revealUntilFrame = 0;
    this._soundEvents = [];
    this.releaseInputs();
    this.prepareServe();
  }

  /**
   * Applies one paddle motion or red-button state, including hold-to-catch.
   * @param input - The controller action.
   * @param active - Whether it is held.
   * @public
   */
  public setInput(input: BreakoutInput, active: boolean): void {
    if (active && (this._status === 'paused' || this._status === 'gameOver')) return;
    const wasActive = this._inputs.has(input);
    if (active) this._inputs.add(input);
    else this._inputs.delete(input);
    if (this._status === 'paused' || this._status === 'gameOver') return;
    if (input !== 'fire' && input !== 'secondFire') return;
    const paddle = input === 'secondFire' ? 1 : 0;
    if (paddle >= this.currentTeam().paddles.length) return;
    if (active && !wasActive && this._status === 'ready') this.serve(paddle);
    else if (!active && wasActive && this._attachedPaddle === paddle && this._status === 'playing')
      this.serve(paddle);
  }

  /**
   * Maps a mouse or trackpad position to the active paddle in that half of the field.
   * @param normalizedX - Position from zero to one across the playfield.
   * @public
   */
  public movePointer(normalizedX: number): void {
    if (!Number.isFinite(normalizedX) || this._status === 'paused' || this._status === 'gameOver')
      return;
    const x = Math.max(0, Math.min(1, normalizedX)) * 160;
    const team = this.currentTeam();
    this.movePaddle(team.paddles.length === 1 || x < 80 ? 0 : 1, x);
    this.followAttachedBall();
  }

  /**
   * Advances only active play using fixed frames and collision-safe motion substeps.
   * @param milliseconds - Real elapsed time supplied by the shared canvas controller.
   * @public
   */
  public step(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0 || this._status === 'paused') return;
    this._accumulator += Math.min(250, milliseconds);
    while (this._accumulator + 0.000001 >= FRAME_MS) {
      this._accumulator -= FRAME_MS;
      this.advanceFrame();
    }
  }

  /** Freezes the current serve or rally on application focus loss. @public */
  public pause(): void {
    if (this._status === 'paused' || this._status === 'gameOver') return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this.releaseInputs();
  }

  /** Toggles the browser pause adaptation without consuming a ball. @public */
  public togglePause(): void {
    if (this._status === 'paused') {
      this._status = this._resumeStatus;
      this._accumulator = 0;
    } else this.pause();
  }

  /** Releases all controls without launching a caught ball while focus is elsewhere. @public */
  public releaseInputs(): void {
    this._inputs.clear();
    this._steerDelta = 0;
  }

  /**
   * Positions an active ball for deterministic simulation and collision regression checks.
   * @param x - Horizontal ball center.
   * @param y - Vertical ball center.
   * @param vx - Horizontal velocity in logical pixels per second.
   * @param vy - Vertical velocity in logical pixels per second.
   * @public
   */
  public placeBall(x: number, y: number, vx: number, vy: number): void {
    if (![x, y, vx, vy].every(Number.isFinite)) return;
    this._ball = { x, y, vx, vy };
    this._attachedPaddle = null;
    this._status = 'playing';
  }

  /** Enables the session-only lower safety edge without resetting the match. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
  }

  private currentTeam(): ITeam {
    const team = this._teams[this._currentTeam];
    if (!team) throw new Error('Breakout requires an active team.');
    return team;
  }

  private paddleWidth(): number {
    const difficulty =
      this._currentTeam === 0 ? this._options.difficultyA : this._options.difficultyB;
    return difficulty === 'A' ? 20 : 15;
  }

  private movePaddle(index: number, target: number): void {
    const team = this.currentTeam();
    const old = team.paddles[index];
    if (old === undefined) return;
    const half = this.paddleWidth() / 2;
    const minimum = team.paddles.length === 1 || index === 0 ? WALL_LEFT + half : 80 + half;
    const maximum = team.paddles.length === 1 || index === 1 ? WALL_RIGHT - half : 80 - half;
    const next = Math.max(minimum, Math.min(maximum, target));
    team.paddles[index] = next;
    if (index === this._lastPaddle) this._steerDelta += next - old;
  }

  private advanceFrame(): void {
    this._frame += 1;
    if (this._status === 'gameOver') return;
    const team = this.currentTeam();
    for (let paddle = 0; paddle < team.paddles.length; paddle++) {
      const left = this._inputs.has(paddle === 0 ? 'left' : 'secondLeft');
      const right = this._inputs.has(paddle === 0 ? 'right' : 'secondRight');
      this.movePaddle(
        paddle,
        (team.paddles[paddle] ?? 80) + ((Number(right) - Number(left)) * 130) / 60,
      );
    }
    this.followAttachedBall();
    if (this._status !== 'playing') {
      this._steerDelta = 0;
      return;
    }
    team.elapsedFrames += 1;
    if (this._attachedPaddle !== null) {
      this._steerDelta = 0;
      return;
    }
    const variation = BreakoutVariations[this._options.variation - 1] ?? BreakoutVariations[0];
    if (variation.steer && this._steerDelta !== 0) {
      const speed = Math.hypot(this._ball.vx, this._ball.vy);
      this._ball.vx = Math.max(
        -speed * 0.94,
        Math.min(speed * 0.94, this._ball.vx + this._steerDelta * 1.8),
      );
      this._ball.vy =
        Math.sign(this._ball.vy || -1) *
        Math.sqrt(Math.max(0, speed * speed - this._ball.vx * this._ball.vx));
    }
    this._steerDelta = 0;
    const substeps = Math.max(1, Math.ceil(Math.hypot(this._ball.vx, this._ball.vy) / 60 / 0.75));
    const wallNumber = team.wallsCleared;
    for (
      let step = 0;
      step < substeps && this._status === 'playing' && this._attachedPaddle === null;
      step++
    ) {
      this.moveBall(1 / 60 / substeps);
      if (this._currentTeam !== this._teams.indexOf(team) || team.wallsCleared !== wallNumber)
        break;
    }
  }

  private followAttachedBall(): void {
    if (this._attachedPaddle === null) return;
    const paddle = this.currentTeam().paddles[this._attachedPaddle] ?? 80;
    this._ball.x = paddle + this._catchOffset;
    this._ball.y = PADDLE_Y - BALL_RADIUS - 1;
  }

  private serve(paddle: number): void {
    if (this._status === 'ready') {
      this._fast = false;
      this._consecutiveHits = 0;
      this._catchOffset = 0;
    }
    this._lastPaddle = paddle;
    this._ball.x = (this.currentTeam().paddles[paddle] ?? 80) + this._catchOffset;
    this._ball.y = PADDLE_Y - BALL_RADIUS - 1;
    this._attachedPaddle = null;
    this._status = 'playing';
    const speed = this._fast ? FAST_SPEED : BASE_SPEED;
    const direction = this._ball.x < 80 ? 1 : -1;
    this._ball.vx = direction * speed * 0.42;
    this._ball.vy = -Math.sqrt(speed * speed - this._ball.vx * this._ball.vx);
    this.emit('serve');
  }

  private moveBall(seconds: number): void {
    const previousX = this._ball.x;
    const previousY = this._ball.y;
    this._ball.x += this._ball.vx * seconds;
    this._ball.y += this._ball.vy * seconds;
    if (this._ball.x - BALL_RADIUS < WALL_LEFT) {
      this._ball.x = WALL_LEFT + BALL_RADIUS;
      this._ball.vx = Math.abs(this._ball.vx);
      this.emit('wall');
    } else if (this._ball.x + BALL_RADIUS > WALL_RIGHT) {
      this._ball.x = WALL_RIGHT - BALL_RADIUS;
      this._ball.vx = -Math.abs(this._ball.vx);
      this.emit('wall');
    }
    if (this._ball.y - BALL_RADIUS < CEILING_Y) {
      this._ball.y = CEILING_Y + BALL_RADIUS;
      this._ball.vy = Math.abs(this._ball.vy);
      this.emit('wall');
    }
    if (this.hitPaddle(previousY)) return;
    if (this._ball.y - BALL_RADIUS > 192) {
      if (this._godMode) {
        this._ball.y = 192 - BALL_RADIUS;
        this._ball.vy = -Math.abs(this._ball.vy);
        this.emit('wall');
      } else this.loseBall();
      return;
    }
    this.hitBrick(previousX, previousY);
  }

  private hitPaddle(previousY: number): boolean {
    if (
      this._ball.vy <= 0 ||
      previousY + BALL_RADIUS > PADDLE_Y + 3 ||
      this._ball.y + BALL_RADIUS < PADDLE_Y
    )
      return false;
    const team = this.currentTeam();
    for (const [index, center] of team.paddles.entries()) {
      const half = this.paddleWidth() / 2;
      if (this._ball.x + BALL_RADIUS < center - half || this._ball.x - BALL_RADIUS > center + half)
        continue;
      this._ball.y = PADDLE_Y - BALL_RADIUS;
      this._lastPaddle = index;
      this._consecutiveHits += 1;
      if (this._consecutiveHits >= 12) this._fast = true;
      const variation = BreakoutVariations[this._options.variation - 1] ?? BreakoutVariations[0];
      if (variation.catchBall && this._inputs.has(index === 0 ? 'fire' : 'secondFire')) {
        this._attachedPaddle = index;
        this._catchOffset = Math.max(-half + 1, Math.min(half - 1, this._ball.x - center));
        this._ball.vx = 0;
        this._ball.vy = 0;
      } else {
        const zone = Math.max(
          0,
          Math.min(4, Math.floor(((this._ball.x - center + half) / (half * 2)) * 5)),
        );
        const cycle = this._consecutiveHits % 12;
        const reduction = cycle >= 11 ? 15 : cycle >= 7 ? 10 : cycle >= 3 ? 5 : 0;
        const horizontalAngle = zone === 2 ? 90 : (zone === 0 || zone === 4 ? 25 : 50) - reduction;
        const radians = (horizontalAngle * Math.PI) / 180;
        const speed = this._fast ? FAST_SPEED : BASE_SPEED;
        this._ball.vx = zone === 2 ? 0 : (zone < 2 ? -1 : 1) * Math.cos(radians) * speed;
        this._ball.vy = -Math.sin(radians) * speed;
      }
      this.emit('paddle');
      return true;
    }
    return false;
  }

  private hitBrick(previousX: number, previousY: number): void {
    const team = this.currentTeam();
    const breakthrough = BreakoutVariations[this._options.variation - 1]?.breakthrough === true;
    for (let id = 0; id < team.bricks.length; id++) {
      if (!team.bricks[id]) continue;
      const row = Math.floor(id / 18);
      const left = 8 + (id % 18) * 8;
      const top = 36 + row * 5;
      if (
        this._ball.x + BALL_RADIUS < left ||
        this._ball.x - BALL_RADIUS > left + 7 ||
        this._ball.y + BALL_RADIUS < top ||
        this._ball.y - BALL_RADIUS > top + 4
      )
        continue;
      team.bricks[id] = false;
      team.score += ROW_POINTS[row] ?? 0;
      this._revealUntilFrame = this._frame + 18;
      this.emit(row < 2 ? 'brickHigh' : row < 4 ? 'brickMid' : 'brickLow');
      if (row < 3 && !this._fast) {
        this._fast = true;
        const speed = Math.hypot(this._ball.vx, this._ball.vy) || BASE_SPEED;
        this._ball.vx *= FAST_SPEED / speed;
        this._ball.vy *= FAST_SPEED / speed;
      }
      if (!breakthrough) {
        const crossedSide = previousX + BALL_RADIUS <= left || previousX - BALL_RADIUS >= left + 7;
        const crossedVertical =
          previousY + BALL_RADIUS <= top || previousY - BALL_RADIUS >= top + 4;
        if (crossedSide && !crossedVertical) {
          this._ball.vx *= -1;
          this._ball.x = previousX;
        } else {
          this._ball.vy *= -1;
          this._ball.y = previousY;
        }
      }
      if (team.bricks.every((alive) => !alive)) {
        team.wallsCleared += 1;
        this.emit('complete');
        if (team.wallsCleared === 2) {
          team.finished = true;
          this.nextTeam();
        } else team.bricks = Array.from({ length: 108 }, () => true);
        return;
      }
      if (!breakthrough) return;
    }
  }

  private loseBall(): void {
    const team = this.currentTeam();
    team.ballsLost += 1;
    team.finished = team.ballsLost >= 5;
    this.emit('miss');
    this.nextTeam();
  }

  private nextTeam(): void {
    if (this._teams.every((team) => team.finished)) {
      this.finishMatch();
      return;
    }
    for (let offset = 1; offset <= this._teams.length; offset++) {
      const index = (this._currentTeam + offset) % this._teams.length;
      if (!this._teams[index]?.finished) {
        this._currentTeam = index;
        this.prepareServe();
        return;
      }
    }
  }

  private prepareServe(): void {
    this._status = 'ready';
    this._attachedPaddle = 0;
    this._catchOffset = 0;
    this._ball.vx = 0;
    this._ball.vy = 0;
    this._consecutiveHits = 0;
    this._fast = false;
    this.releaseInputs();
    this.followAttachedBall();
  }

  private finishMatch(): void {
    this._status = 'gameOver';
    this._attachedPaddle = null;
    this._ball.vx = 0;
    this._ball.vy = 0;
    this.releaseInputs();
    const first = this._teams[0];
    const second = this._teams[1];
    if (!first) return;
    if (!second) {
      this._winner = first.wallsCleared === 2 ? 0 : null;
      return;
    }
    const timed = BreakoutVariations[this._options.variation - 1]?.timed === true;
    let comparison = first.score - second.score;
    if (timed && first.wallsCleared === 2 && second.wallsCleared === 2)
      comparison = second.elapsedFrames - first.elapsedFrames;
    else if (comparison === 0 && first.wallsCleared === 2)
      comparison = second.ballsLost - first.ballsLost;
    else if (timed && comparison === 0) comparison = second.elapsedFrames - first.elapsedFrames;
    this._winner = comparison === 0 ? 'tie' : comparison > 0 ? 0 : 1;
  }

  private emit(kind: IBreakoutSnapshot['soundEvents'][number]['kind']): void {
    this._soundEvents = [...this._soundEvents.slice(-31), { id: ++this._soundId, kind }];
  }

  // #endregion
}
