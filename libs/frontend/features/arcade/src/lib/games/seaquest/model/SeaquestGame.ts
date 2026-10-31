// #region Imports

import type { ISeaquestOptions } from './ISeaquestOptions';
import type { ISeaquestSnapshot } from './ISeaquestSnapshot';
import type { ISeaquestSoundEvent } from './ISeaquestSoundEvent';
import type { SeaquestInput } from './SeaquestInput';
import { SeaquestSpritePatterns } from '../rendering/SeaquestSpritePatterns';

// #endregion

interface IPlayer {
  score: number;
  level: number;
  difficulty: number;
  divers: number;
  reserves: number;
  elapsedFrames: number;
  outcome: 'lost' | 'completed' | null;
}
interface IRow {
  x: number;
  direction: -1 | 1;
  kind: 'shark' | 'sub';
  mask: number;
  diver: number | null;
  diverState: 'available' | 'swimming' | 'rescued';
  torpedo: number | null;
  caughtDiver: boolean;
}

const DEFAULT_OPTIONS: ISeaquestOptions = { players: 1, difficultyA: 'B', difficultyB: 'B' };
const FRAME_MS = 1000 / 60;
const LANE_Y = [32, 56, 80, 104] as const;
const GROUP_MASKS = [1, 1, 3, 3, 5, 5, 7, 7] as const;

/** Original cartridge rules and integer NTSC movement, independent of browser timing. @public */
export class SeaquestGame {
  // #region Fields

  private _options = DEFAULT_OPTIONS;
  private _players: IPlayer[] = [];
  private _current = 0;
  private _status: ISeaquestSnapshot['status'] = 'ready';
  private _resumeStatus: ISeaquestSnapshot['status'] = 'ready';
  private _frame = 0;
  private _accumulator = 0;
  private _oxygen = 64;
  private _x = 76;
  private _y = 13;
  private _facing: -1 | 1 = 1;
  private _torpedo: { x: number; direction: -1 | 1 } | null = null;
  private _patrolX = 0;
  private _deathFrames = 0;
  private _refillReason: 'early' | 'full' | 'death' = 'death';
  private _random = 1;
  private _rows: IRow[] = [];
  private _fractions = [0, 0, 0];
  private readonly _inputs = new Set<SeaquestInput>();
  private _soundId = 0;
  private _sounds: ISeaquestSoundEvent[] = [];
  private _godMode = false;

  // #endregion

  // #region Ctor

  /** Creates a one-player rescue with the original fast-fire B switch. @public */
  public constructor() {
    this.newGame(DEFAULT_OPTIONS);
  }

  // #endregion

  // #region Properties

  /** Detached frame for painting, accessibility and completed-player recording. @public */
  public get snapshot(): ISeaquestSnapshot {
    const player = this.current();
    return {
      status: this._status,
      options: { ...this._options },
      frame: this._frame,
      currentPlayer: (this._current + 1) as 1 | 2,
      score: player.score,
      level: player.level + 1,
      difficulty: player.difficulty,
      divers: player.divers,
      oxygen: this._oxygen,
      reserves: player.reserves,
      elapsedSeconds: player.elapsedFrames / 60,
      player: {
        x: this._x,
        y: this._y,
        facing: this._facing,
        animation: 2 - (Math.floor(this._frame / 4) % 3),
        deathFrame: this._deathFrames,
      },
      torpedo: this._torpedo ? { ...this._torpedo, y: this._y + 8 } : null,
      patrol: { x: this._patrolX, active: player.level >= 2 && this._patrolX < 160 },
      rows: this._rows.map((row, lane) => ({
        lane,
        y: LANE_Y[lane] ?? 32,
        kind: row.kind,
        direction: row.direction,
        positions: this.positions(row),
        diver: row.diver,
        torpedo: row.torpedo,
        caughtDiver: row.caughtDiver,
      })),
      players: this._players.map((value, index) => ({
        player: (index + 1) as 1 | 2,
        score: value.score,
        level: value.level + 1,
        reserves: value.reserves,
        divers: value.divers,
        elapsedSeconds: value.elapsedFrames / 60,
        outcome: value.outcome,
      })),
      soundEvents: this._sounds.map((event) => ({ ...event })),
    };
  }

  // #endregion

  // #region Methods

  /** Applies Game Select and the two independent fire-speed switches. @public */
  public newGame(options: ISeaquestOptions = DEFAULT_OPTIONS): void {
    this._options = { ...options };
    this._players = Array.from({ length: options.players }, () => ({
      score: 0,
      level: 0,
      difficulty: 0,
      divers: 0,
      reserves: 3,
      elapsedFrames: 0,
      outcome: null,
    }));
    this._current = 0;
    this._frame = 0;
    this._accumulator = 0;
    this._random = 1;
    this._sounds = [];
    this._fractions = [0, 0, 0];
    this._rows = Array.from({ length: 4 }, () => ({
      x: 0,
      direction: 1,
      kind: 'shark',
      mask: 1,
      diver: null,
      diverState: 'available',
      torpedo: null,
      caughtDiver: false,
    }));
    this.resetSub();
    this._oxygen = 64;
    this._status = 'ready';
    this._rows.forEach((_, lane) => this.spawn(lane, (0xd8 >> lane) & 255));
  }

  /** Preserves one logical control across frames and multiple physical-key aliases. @public */
  public setInput(input: SeaquestInput, active: boolean): void {
    if (active) this._inputs.add(input);
    else this._inputs.delete(input);
  }

  /** Atomically cancels movement and fire on menu, pause or focus changes. @public */
  public releaseInputs(): void {
    this._inputs.clear();
  }

  /** Freezes every active stage, including rewards, refill and death animation. @public */
  public pause(): void {
    if (this._status === 'paused' || this._status === 'gameOver' || this._status === 'completed')
      return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this._accumulator = 0;
    this.releaseInputs();
  }

  /** Resumes the exact stage that was paused. @public */
  public togglePause(): void {
    if (this._status === 'paused') this._status = this._resumeStatus;
    else this.pause();
  }

  /** Session test mode prevents loss from collisions, oxygen and empty surfacing. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
  }

  /** Advances integer 60 Hz frames and bounds browser catch-up after suspension. @public */
  public step(elapsedMilliseconds: number): void {
    if (
      !Number.isFinite(elapsedMilliseconds) ||
      elapsedMilliseconds <= 0 ||
      this._status === 'paused' ||
      this._status === 'gameOver' ||
      this._status === 'completed'
    )
      return;
    this._accumulator += Math.min(250, elapsedMilliseconds);
    while (this._accumulator + 0.00001 >= FRAME_MS) {
      this._accumulator -= FRAME_MS;
      this.advance();
      if (this.inStage('gameOver') || this.inStage('completed')) break;
    }
  }

  private inStage(stage: ISeaquestSnapshot['status']): boolean {
    return this._status === stage;
  }

  private current(): IPlayer {
    return this._players[this._current]!;
  }

  private advance(): void {
    if (this._status === 'ready' && !this._inputs.has('down')) {
      if (this._inputs.has('left')) {
        this._x = Math.max(21, this._x - 1);
        this._facing = -1;
      }
      if (this._inputs.has('right')) {
        this._x = Math.min(134, this._x + 1);
        this._facing = 1;
      }
      return;
    }
    if (this._status === 'ready') this._status = 'playing';
    this._frame++;
    this.current().elapsedFrames++;
    if (this._frame % 8 === 0) {
      for (let i = 0; i < 3; i++)
        this._random =
          ((this._random << 1) | (((this._random >> 4) ^ (this._random >> 7)) & 1)) & 255;
    }
    if (this._status === 'dying') {
      this._deathFrames--;
      if (this._deathFrames === 0) this.finishDeath();
      return;
    }
    if (this._status === 'oxygen-bonus') {
      if (this._frame % 2 === 0 && this._oxygen > 0) {
        this.sound('bonus', this._oxygen);
        this._oxygen--;
        if (this.addScore(this.enemyPoints())) return;
      }
      if (this._oxygen === 0 && this.inStage('oxygen-bonus')) this._status = 'diver-bonus';
      return;
    }
    if (this._status === 'diver-bonus') {
      if (this._frame % 16 === 0) {
        if (this.current().divers > 0) {
          this.current().divers--;
          this.sound('surface');
          if (this.addScore(Math.min(1000, (this.current().level + 1) * 50))) return;
        } else {
          this.current().level++;
          this.current().difficulty = Math.max(this.current().difficulty, this.current().level);
          this.beginRefill('full');
        }
      }
      return;
    }
    this.movePatrol();
    if (this.inStage('dying')) return;
    if (this._status === 'refilling') {
      if (this._refillReason === 'early') this.moveRows();
      if (this._frame % 2 === 0) {
        this._oxygen = Math.min(64, this._oxygen + 1);
        this.sound('refill', this._oxygen);
        if (this._oxygen === 64) {
          if (this._refillReason === 'early') {
            this.current().divers = Math.max(0, this.current().divers - 1);
            this.current().difficulty++;
          } else this._rows.forEach((_, lane) => this.spawn(lane, (this._frame >> lane) & 255));
          this._status = 'ready';
        }
      }
      return;
    }
    this.moveRows();
    this.collide();
    if (this._status !== 'playing') return;
    if (this._y === 13 && this._oxygen < 64) {
      if (this.current().divers === 6) {
        this._status = 'oxygen-bonus';
        this._torpedo = null;
        this.sound('shot-end');
      } else if (this.current().divers > 0 || this._godMode) this.beginRefill('early');
      else this.die();
      return;
    }
    if (this._inputs.has('up')) this._y = Math.max(13, this._y - 1);
    if (this._inputs.has('down')) this._y = Math.min(108, this._y + 1);
    if (this._inputs.has('left')) {
      this._x = Math.max(21, this._x - 1);
      this._facing = -1;
    }
    if (this._inputs.has('right')) {
      this._x = Math.min(134, this._x + 1);
      this._facing = 1;
    }
    this.moveTorpedo();
    if (!this.inStage('playing')) return;
    if (this._y >= 20 && this._frame % 32 === 0) {
      this._oxygen = Math.max(this._godMode ? 1 : 0, this._oxygen - 1);
      if (this._oxygen > 0 && this._oxygen < 17) this.sound('warning');
      if (this._oxygen === 0) this.die();
    }
  }

  private moveTorpedo(): void {
    if (!this._torpedo && this._inputs.has('fire') && this._y >= 18) {
      this._torpedo = { x: this._x + 8, direction: this._facing };
      if (this._oxygen >= 17) this.sound('shoot');
    }
    if (!this._torpedo) return;
    const difficulty = this._current === 0 ? this._options.difficultyA : this._options.difficultyB;
    const before = this._torpedo.x;
    this._torpedo.x += this._torpedo.direction * (difficulty === 'A' ? 3 : 5);
    // Sweep the missile's width so that high-speed crossing cannot tunnel through a sprite.
    for (let lane = 0; lane < this._rows.length; lane++) {
      const row = this._rows[lane]!;
      for (let bit = 0; bit < 3; bit++) {
        if (!(row.mask & (1 << bit))) continue;
        const x = this.visibleX(row.x + bit * 16);
        const pattern = this.enemySprite(row);
        const y = this.enemyY(row, lane);
        const left = Math.min(before, this._torpedo.x);
        const right = Math.max(before, this._torpedo.x) + 8;
        if (
          this.bitmapOverlaps(pattern, x, y, 1, row.direction, left, this._y + 8, right - left, 2)
        ) {
          row.mask &= ~(1 << bit);
          this._torpedo = null;
          this.sound('shot-end');
          this.sound(row.kind === 'shark' ? 'enemy-shark' : 'enemy-sub');
          this.addScore(this.enemyPoints());
          row.caughtDiver = false;
          if (row.mask === 0 && row.kind === 'shark') this.spawn(lane, this._random);
          return;
        }
      }
    }
    if (this._torpedo.x < 0 || this._torpedo.x >= 160) {
      this._torpedo = null;
      this.sound('shot-end');
    }
  }

  private moveRows(): void {
    const difficulty = Math.min(249, this.current().difficulty);
    const speeds = [Math.floor((difficulty + 6) / 2), difficulty + 6, difficulty + 16].map(
      (value, index) => {
        const sum = (this._fractions[index] ?? 0) + value;
        this._fractions[index] = sum % 16;
        return Math.floor(sum / 16);
      },
    );
    this._rows.forEach((row, lane) => {
      row.x = (row.x + row.direction * speeds[1]! + 256) & 255;
      if (
        (row.direction === 1 && (row.x & 248) === 160) ||
        (row.direction === -1 && (row.x & 248) === 216)
      ) {
        row.kind = row.kind === 'shark' ? 'sub' : 'shark';
        row.direction = this._random & 8 ? -1 : 1;
        row.x = row.direction === 1 ? 168 : 215;
        row.caughtDiver = false;
        row.torpedo = null;
        row.diver = null;
        if (row.diverState !== 'rescued' && this._random >= 80) row.diverState = 'swimming';
      }
      if (row.kind === 'shark' && row.diverState === 'swimming') {
        const speed = speeds[row.caughtDiver ? 1 : 0]!;
        row.diver ??= row.direction === 1 ? 0 : 159;
        row.diver += row.direction * speed;
        if (row.diver < 0 || row.diver >= 160) {
          row.diver = null;
          row.diverState = 'available';
        }
        if (row.diver !== null && this.positions(row).some((x) => Math.abs(x - row.diver!) < 7))
          row.caughtDiver = true;
      } else if (row.kind === 'sub') {
        if (row.torpedo !== null) {
          row.torpedo += row.direction * speeds[2]!;
          if (row.torpedo < 0 || row.torpedo >= 160) row.torpedo = null;
        }
        if (row.torpedo === null && row.mask !== 0) {
          const positions = this.positions(row).filter((x) => x >= 39 && x < 127);
          const lead = row.direction === 1 ? positions.at(-1) : positions[0];
          if (lead !== undefined) row.torpedo = lead + (row.direction === 1 ? 8 : -4);
        }
        if (row.mask === 0 && row.torpedo === null) this.spawn(lane, this._random | 128);
      }
    });
  }

  private collide(): void {
    for (let lane = 0; lane < this._rows.length; lane++) {
      const row = this._rows[lane]!;
      const y = LANE_Y[lane]!;
      if (
        row.kind === 'shark' &&
        row.diver !== null &&
        this.current().divers < 6 &&
        this.hitsPlayer(
          SeaquestSpritePatterns.diverRight[Math.floor(this._frame / 8) % 3]!,
          row.diver,
          y,
          1,
          row.direction,
        )
      ) {
        this.current().divers++;
        row.diver = null;
        row.diverState = 'rescued';
        row.caughtDiver = false;
        this.sound(this.current().divers === 6 ? 'full' : 'diver');
        if (this._rows.every((value) => value.diverState === 'rescued'))
          this._rows.forEach((value) => {
            value.diverState = 'available';
          });
      }
      if (this._godMode) continue;
      if (
        row.torpedo !== null &&
        this.bitmapOverlaps(
          this.playerSprite(),
          this._x,
          this._y,
          2,
          this._facing,
          row.torpedo,
          y + 7,
          4,
          2,
        )
      ) {
        this.die();
        return;
      }
      for (let bit = 0; bit < 3; bit++) {
        if (!(row.mask & (1 << bit))) continue;
        if (
          this.hitsPlayer(
            this.enemySprite(row),
            this.visibleX(row.x + bit * 16),
            this.enemyY(row, lane),
            1,
            row.direction,
          )
        ) {
          row.mask &= ~(1 << bit);
          if (!this.addScore(this.enemyPoints())) this.die();
          return;
        }
      }
    }
  }

  private movePatrol(): void {
    const level = this.current().level;
    if (level < 2) return;
    const delay = level < 5 ? 4 : 2;
    if (this._frame % delay === 0) this._patrolX = (this._patrolX - 1 + 256) & 255;
    if (
      !this._godMode &&
      this._patrolX < 160 &&
      this.hitsPlayer(
        SeaquestSpritePatterns.player[2 - (Math.floor(this._frame / 4) % 3)]!,
        this._patrolX,
        13,
        1,
        -1,
      )
    )
      this.die();
  }

  private spawn(lane: number, seed: number): void {
    const row = this._rows[lane]!;
    row.direction = seed & 8 ? -1 : 1;
    row.kind = 'shark';
    row.mask = GROUP_MASKS[this.current().difficulty & 7]!;
    if (row.direction === -1)
      row.mask = ((row.mask & 1) << 2) | (row.mask & 2) | ((row.mask & 4) >> 2);
    row.x = row.direction === 1 ? 168 : 215;
    row.torpedo = null;
    row.caughtDiver = false;
    if (row.diverState !== 'rescued' && seed >= 80) row.diverState = 'swimming';
    if (row.diverState === 'swimming') row.diver = row.direction === 1 ? 0 : 159;
    else row.diver = null;
  }

  private positions(row: IRow): number[] {
    return [0, 1, 2]
      .filter((bit) => !!(row.mask & (1 << bit)))
      .map((bit) => this.visibleX(row.x + bit * 16))
      .filter((x) => x >= -8 && x < 160);
  }

  private visibleX(x: number): number {
    const value = x & 255;
    return value > 200 ? value - 256 : value;
  }

  private enemyY(row: IRow, lane: number): number {
    const phase = (this._frame >> 2) & 15;
    return LANE_Y[lane]! + (row.kind === 'shark' ? 7 - (phase < 8 ? phase : 15 - phase) : 0);
  }

  private enemySprite(row: IRow): readonly number[] {
    return row.kind === 'sub'
      ? this.playerSprite()
      : SeaquestSpritePatterns.shark[2 - (Math.floor(this._frame / 8) % 3)]!;
  }

  private playerSprite(): readonly number[] {
    return SeaquestSpritePatterns.player[2 - (Math.floor(this._frame / 4) % 3)]!;
  }

  private hitsPlayer(
    pattern: readonly number[],
    x: number,
    y: number,
    scale: number,
    facing: number,
  ): boolean {
    for (let line = 0; line < pattern.length; line++) {
      for (let bit = 0; bit < 8; bit++) {
        if (!(pattern[line]! & (128 >> bit))) continue;
        const px = x + (facing === -1 ? 7 - bit : bit) * scale;
        if (
          this.bitmapOverlaps(
            this.playerSprite(),
            this._x,
            this._y,
            2,
            this._facing,
            px,
            y + line,
            scale,
            1,
          )
        )
          return true;
      }
    }
    return false;
  }

  private bitmapOverlaps(
    pattern: readonly number[],
    x: number,
    y: number,
    scale: number,
    facing: number,
    left: number,
    top: number,
    width: number,
    height: number,
  ): boolean {
    if (
      x >= left + width ||
      x + 8 * scale <= left ||
      y >= top + height ||
      y + pattern.length <= top
    )
      return false;
    for (
      let row = Math.max(0, Math.floor(top - y));
      row < Math.min(pattern.length, top + height - y);
      row++
    ) {
      for (let bit = 0; bit < 8; bit++) {
        const px = x + (facing === -1 ? 7 - bit : bit) * scale;
        if (pattern[row]! & (128 >> bit) && px < left + width && px + scale > left) return true;
      }
    }
    return false;
  }

  private beginRefill(reason: 'early' | 'full' | 'death'): void {
    this._status = 'refilling';
    this._refillReason = reason;
    this._torpedo = null;
    this.sound('shot-end');
    if (reason !== 'early')
      this._rows.forEach((row) => {
        row.x = 208;
        row.diver = null;
        row.torpedo = null;
      });
  }

  private die(): void {
    if (this._godMode || this._status === 'dying') return;
    this._status = 'dying';
    this._deathFrames = 92;
    this._torpedo = null;
    this._patrolX = 0;
    this.sound('death');
    this.releaseInputs();
  }

  private finishDeath(): void {
    const player = this.current();
    player.divers = Math.max(0, player.divers - 1);
    if (player.reserves === 0) player.outcome = 'lost';
    else player.reserves--;
    const next = (this._current + 1) % this._players.length;
    if (this._players[next]!.outcome === null) this._current = next;
    if (this.current().outcome !== null) {
      this._status = this._players.some((value) => value.outcome === 'completed')
        ? 'completed'
        : 'gameOver';
      return;
    }
    this.resetSub();
    this._oxygen = 0;
    this.beginRefill('death');
  }

  private resetSub(): void {
    this._x = 76;
    this._y = 13;
    this._facing = 1;
    this._torpedo = null;
    this._patrolX = 0;
    this._deathFrames = 0;
    this.releaseInputs();
  }

  private enemyPoints(): number {
    return Math.min(90, (this.current().level + 2) * 10);
  }

  private addScore(points: number): boolean {
    const player = this.current();
    const before = Math.floor(player.score / 10_000);
    player.score = Math.min(999_999, player.score + points);
    player.reserves = Math.min(6, player.reserves + Math.floor(player.score / 10_000) - before);
    if (player.score === 999_999) {
      player.outcome = 'completed';
      this.sound('completed');
      const next = (this._current + 1) % this._players.length;
      if (this._players[next]!.outcome === null) {
        this._current = next;
        this.resetSub();
        this._oxygen = 0;
        this.beginRefill('death');
      } else this._status = 'completed';
      return true;
    }
    return false;
  }

  private sound(kind: ISeaquestSoundEvent['kind'], value = this._oxygen): void {
    this._sounds.push({ id: ++this._soundId, kind, frame: this._frame, value });
    if (this._sounds.length > 96) this._sounds.splice(0, this._sounds.length - 96);
  }

  // #endregion
}
