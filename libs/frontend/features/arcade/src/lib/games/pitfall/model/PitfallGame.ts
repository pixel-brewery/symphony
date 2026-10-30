// #region Imports

import { createPitfallRoom } from './createPitfallRoom';
import type { IPitfallRoom } from './IPitfallRoom';
import type { IPitfallSnapshot } from './IPitfallSnapshot';
import type { IPitfallSoundEvent } from './IPitfallSoundEvent';
import { PitfallSpritePatterns } from './PitfallSpritePatterns';
import type { PitfallInput } from './PitfallInput';
import type { PitfallStatus } from './PitfallStatus';

// #endregion

const FRAME_MILLISECONDS = 1000 / 60;
const GAME_FRAMES = 20 * 60 * 60;
const FEET_OFFSET = 88;
const SURFACE_Y = 32;
const UNDERGROUND_Y = 86;
const JUMP_DELTAS = [
  1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, -1, 0, 0, 0, -1, 0, 0, -1, 0, -1, -1, -1, -1, -1,
  -1, -1,
] as const;

/**
 * Deterministic NTSC Pitfall rules, reconstructed from the commented 6502 disassembly.
 * Original integer positions, bitmap collisions, jump table, reversible rooms and clocks
 * are independent of the canvas size. Browser focus and pause are host adaptations.
 * @public
 */
export class PitfallGame {
  // #region Fields

  private _status: PitfallStatus = 'ready';
  private _resumeStatus: 'ready' | 'playing' = 'ready';
  private _terminalReason: IPitfallSnapshot['terminalReason'] = null;
  private _roomIndex = 0;
  private _x = 16;
  private _y = SURFACE_Y;
  private _vx = 0;
  private _vy = 0;
  private _facing: -1 | 1 = 1;
  private _pattern = 5;
  private _spriteOffsetY = 0;
  private _inputs = new Set<PitfallInput>();
  private _jumpRequested = false;
  private _jumpIndex = 0;
  private _jumpDirection = 0;
  private _jumpReleasedFromVine = false;
  private _score = 2000;
  private _lives = 3;
  private _collected = new Set<number>();
  private _totalFrames = 0;
  private _displayFrames = 0;
  private _timerFrames = 0;
  private _idleFrames = 0;
  private _accumulator = 0;
  private _deathFrames = 0;
  private _godMode = false;
  private _objectX = 124;
  private _scorpionX = 76;
  private _scorpionFacing: -1 | 1 = -1;
  private _randomAnimation = 1;
  private _pitFrame = 0;
  private _vineAttached = false;
  private _vineHigh = 0;
  private _vineLow = 0;
  private _vineSlope = 0;
  private _vineDirection: -1 | 1 = -1;
  private _vineBottom = 10;
  private _climbPosition = 0;
  private _eventId = 0;
  private _soundEvents: IPitfallSoundEvent[] = [];

  // #endregion

  // #region Properties

  /** Current read model; all positions refer to the original 160 × 192 field. @public @readonly */
  public get snapshot(): IPitfallSnapshot {
    const room = this.currentRoom();
    return {
      status: this._status,
      terminalReason: this._terminalReason,
      score: this._score,
      lives: this._lives,
      treasuresCollected: this._collected.size,
      totalTreasures: 32,
      elapsed: this._timerFrames / 60,
      totalFrames: this._totalFrames,
      displayFrames: this._displayFrames,
      idleFrames: this._idleFrames,
      frame: this._totalFrames & 255,
      timeRemaining: Math.max(0, GAME_FRAMES - this._timerFrames) / 60,
      deathFramesRemaining: this._deathFrames,
      soundEvents: this._soundEvents,
      room,
      player: {
        x: this._x,
        y: this._y + FEET_OFFSET,
        vx: this._vx,
        vy: this._vy,
        facing: this._facing,
        pose:
          this._deathFrames > 0 || this._spriteOffsetY > 0
            ? 'hurt'
            : this._vineAttached
              ? 'swing'
              : this._climbPosition > 0
                ? 'climb'
                : this._jumpIndex > 0
                  ? 'jump'
                  : this._vx === 0
                    ? 'idle'
                    : 'run',
        animationFrame: this._pattern,
        spriteOffsetY: this._spriteOffsetY,
        layer: this._y >= 64 ? 'underground' : 'surface',
        invulnerable: this._godMode,
      },
      vine: room.vine
        ? {
            ...this.vinePosition(),
            attached: this._vineAttached,
            slope: this._vineSlope,
            direction: this._vineDirection,
          }
        : null,
    };
  }

  // #endregion

  // #region Methods

  /** Resets the original starting scene, score, treasures, lives and clocks. @public */
  public startNewGame(): void {
    this._status = 'ready';
    this._resumeStatus = 'ready';
    this._terminalReason = null;
    this._roomIndex = 0;
    this._x = 16;
    this._y = SURFACE_Y;
    this._facing = 1;
    this._pattern = 5;
    this._spriteOffsetY = 0;
    this._jumpIndex = 0;
    this._jumpDirection = 0;
    this._jumpReleasedFromVine = false;
    this._score = 2000;
    this._lives = 3;
    this._collected.clear();
    this._totalFrames = 0;
    this._displayFrames = 0;
    this._timerFrames = 0;
    this._idleFrames = 0;
    this._accumulator = 0;
    this._deathFrames = 0;
    this._randomAnimation = 1;
    this._pitFrame = 0;
    this._vineAttached = false;
    this._vineHigh = 0;
    this._vineLow = 0;
    this._vineSlope = 0;
    this._vineDirection = -1;
    this._vineBottom = 10;
    this._climbPosition = 0;
    this._soundEvents = [];
    this.resetRoomObjects();
    this.releaseInputs();
    this._vy = 0;
  }

  /**
   * Applies one joystick direction or a fresh fire-button press.
   * @param input - The physical control.
   * @param active - Whether the control is held.
   * @public
   */
  public setInput(input: PitfallInput, active: boolean): void {
    if (!active) {
      this._inputs.delete(input);
      if (input === 'jump') this._jumpRequested = false;
      return;
    }
    if (this._status === 'paused' || this._status === 'gameOver' || this._status === 'won') return;
    this._idleFrames = 0;
    if (this._status === 'ready' && input !== 'jump') this._status = 'playing';
    if (input === 'jump' && this._status === 'playing' && !this._inputs.has(input))
      this._jumpRequested = true;
    this._inputs.add(input);
  }

  /** Releases host controls without changing the original airborne momentum. @public */
  public releaseInputs(): void {
    this._inputs.clear();
    this._jumpRequested = false;
    this._vx = 0;
  }

  /** Freezes an unfinished expedition and clears the host's held controls. @public */
  public pause(): void {
    if (this._status !== 'ready' && this._status !== 'playing') return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this.releaseInputs();
  }

  /** Resumes a paused expedition, or pauses a running expedition. @public */
  public togglePause(): void {
    if (this._status === 'paused') this._status = this._resumeStatus;
    else this.pause();
  }

  /**
   * Consumes at most 250 milliseconds per host frame, at exactly 60 simulation frames/second.
   * Large suspension gaps cannot advance an unattended game; fractional time is retained.
   * @param elapsedMilliseconds - Elapsed host time.
   * @public
   */
  public step(elapsedMilliseconds: number): void {
    if (
      !Number.isFinite(elapsedMilliseconds) ||
      elapsedMilliseconds <= 0 ||
      this._status === 'paused'
    )
      return;
    this._soundEvents = [];
    this._accumulator += Math.min(250, elapsedMilliseconds);
    while (this._accumulator + 0.000001 >= FRAME_MILLISECONDS) {
      this._accumulator -= FRAME_MILLISECONDS;
      this._displayFrames += 1;
      if (this._inputs.size === 0) this._idleFrames += 1;
      if (this._status === 'playing') this.advanceFrame();
    }
  }

  /**
   * Places Harry in a deterministic scenario without changing score, treasure or the clock.
   * This narrow test seam uses the same left/feet coordinates exposed by the snapshot.
   * @param roomIndex - Circular destination room.
   * @param x - Left sprite coordinate.
   * @param y - Feet coordinate.
   * @param layer - Destination layer; normally inferred from the feet coordinate.
   * @public
   */
  public placePlayer(
    roomIndex: number,
    x: number,
    y: number,
    layer: 'surface' | 'underground' = 'surface',
  ): void {
    this._roomIndex = ((Math.trunc(roomIndex) % 255) + 255) % 255;
    this._x = Math.round(x);
    this._y = Math.round(y) - FEET_OFFSET;
    this._vx = 0;
    this._vy = 0;
    this._facing = 1;
    this._pattern = 5;
    this._spriteOffsetY = 0;
    this._vineAttached = false;
    this._climbPosition = 0;
    this._deathFrames = 0;
    this._jumpReleasedFromVine = false;
    this._jumpDirection = 0;
    const floor = layer === 'underground' ? UNDERGROUND_Y : SURFACE_Y;
    this._jumpIndex = this._y === floor ? 0 : 32;
    this._status = 'playing';
    this._terminalReason = null;
    this.resetRoomObjects();
    this.releaseInputs();
  }

  /** Enables the session-only test adaptation without resetting the expedition. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
    if (!enabled || this._deathFrames === 0) return;
    this._deathFrames = 0;
    this._spriteOffsetY = 0;
    this._y = this._y >= 64 ? UNDERGROUND_Y : SURFACE_Y;
    this._jumpIndex = 0;
    this._jumpDirection = 0;
    this._vy = 0;
  }

  private advanceFrame(): void {
    if (this._deathFrames > 0) {
      this._deathFrames -= 1;
      if (this._deathFrames === 0) this.respawn();
      return;
    }
    const oldX = this._x;
    const oldY = this._y;
    const direction = this.direction();
    if (this._y < 33 || this._y >= 55) this._pitFrame = this._totalFrames & 255;
    let room = this.currentRoom();
    const contact = this.objectContact(room);
    const ropeContact = this.touchesVine(room);
    // Overscan: bounds and vine collision precede the next movement frame.
    if (
      !this._godMode &&
      this._climbPosition === 0 &&
      this._y === SURFACE_Y &&
      this.inGroundOpening(room)
    ) {
      this._y += 1;
      this._jumpIndex = 32;
      this._jumpDirection = 0;
    }
    if (ropeContact && this._jumpIndex > 0 && !this._jumpReleasedFromVine && !this._vineAttached) {
      this._vineAttached = true;
      this._jumpIndex = 0;
      this.emit('swing');
    }
    this._totalFrames += 1;
    this._randomAnimation =
      ((this._randomAnimation << 1) |
        (((this._randomAnimation >> 6) ^ (this._randomAnimation >> 7)) & 1)) &
      255;
    if (!this.updateJump(room)) return;
    if (!this._godMode) {
      this._timerFrames += 1;
      if (this._timerFrames >= GAME_FRAMES) {
        this.finish('gameOver', 'time');
        return;
      }
    }
    const stoppedByLog = this.resolveContact(room, contact);
    if (this._deathFrames > 0 || this._status !== 'playing') return;
    this.moveVine();
    const canJump =
      this._jumpIndex === 0 &&
      this._climbPosition === 0 &&
      this._spriteOffsetY === 0 &&
      !this._vineAttached;
    if (canJump && this._jumpRequested) {
      this._jumpIndex = 1;
      this._y -= 1;
      this._jumpDirection = stoppedByLog ? 0 : direction;
      this.emit('jump');
    } else if (this._jumpIndex > 0 && this._jumpIndex < 3) {
      this._jumpDirection = stoppedByLog ? 0 : direction;
    }
    this._jumpRequested = false;
    if (this._vineAttached && this._inputs.has('down')) {
      this._vineAttached = false;
      this._jumpIndex = 16;
      this._jumpReleasedFromVine = true;
      this._jumpDirection = this._vineDirection;
    }
    this.updateLadder(room);
    if (this._vineAttached) {
      this._x = 75 + this._vineDirection * (this._vineSlope >> 2);
      this._y = 41 - this._vineBottom;
    }
    if (!this._vineAttached && this._climbPosition <= 11 && (this._totalFrames & 1) === 0) {
      const movement = this._jumpIndex > 0 ? this._jumpDirection : stoppedByLog ? 0 : direction;
      this._x += movement;
      if (movement !== 0) {
        this._facing = movement < 0 ? -1 : 1;
        if ((this._totalFrames & 3) === 0)
          this._pattern = this._pattern <= 0 ? 4 : this._pattern - 1;
      }
    }
    if (this.transitionRoom()) room = this.currentRoom();
    if (room.scorpion && this._x !== this._scorpionX) {
      this._scorpionFacing = this._x < this._scorpionX ? -1 : 1;
      if ((this._totalFrames & 7) === 0) this._scorpionX += this._scorpionFacing;
    }
    if (this._climbPosition === 11 && direction !== 0) {
      this._climbPosition = 0;
      this._y = 31;
      this._jumpIndex = 1;
      this._jumpDirection = direction;
    }
    this.selectPattern(direction);
    if (
      room.sceneType !== 4 &&
      room.sceneType !== 5 &&
      room.objectType < 4 &&
      (this._totalFrames & 1) === 0
    )
      this._objectX = this._objectX === 0 ? 159 : this._objectX - 1;
    this._vx =
      this._x === oldX ? 0 : this._vineAttached ? (this._x - oldX) * 60 : this._x > oldX ? 30 : -30;
    this._vy = (this._y - oldY) * 60;
  }

  private updateJump(room: IPitfallRoom): boolean {
    if (this._climbPosition !== 0 || this._jumpIndex === 0) return true;
    this._y -= JUMP_DELTAS[this._jumpIndex - 1] ?? -1;
    this._jumpIndex = Math.min(32, this._jumpIndex + 1);
    if (this._y === SURFACE_Y || this._y === UNDERGROUND_Y) {
      this._jumpIndex = 0;
      this._jumpReleasedFromVine = false;
    } else if (room.ladderX !== null && this._y === 34) {
      this._score = Math.max(0, this._score - 100);
      this.emit('fall');
    } else if (room.ladderX === null && this._y === 54) {
      if (this._godMode) {
        this._y = SURFACE_Y;
        this._jumpIndex = 0;
        this._jumpDirection = 0;
        return true;
      }
      this.kill();
      return false;
    }
    return true;
  }

  private updateLadder(room: IPitfallRoom): void {
    if (room.ladderX === null) return;
    if (this._climbPosition === 0 && this._x >= 68 && this._x < 83) {
      if (this._y >= 84 && this._inputs.has('up')) this._climbPosition = 21;
      else if (this._y === SURFACE_Y && this._inputs.has('down')) this._climbPosition = 12;
      if (this._climbPosition > 0) this._x = 76;
    }
    if (this._climbPosition === 0) return;
    this._jumpIndex = 0;
    if ((this._totalFrames & 7) === 0) {
      this._climbPosition += Number(this._inputs.has('down')) - Number(this._inputs.has('up'));
      this._climbPosition = Math.max(11, this._climbPosition);
      if (this._climbPosition >= 22) {
        this._climbPosition = 0;
        this._y = UNDERGROUND_Y;
        return;
      }
    }
    this._y = this._climbPosition * 4 + 2;
  }

  private inGroundOpening(room: IPitfallRoom): boolean {
    let bounds: readonly (readonly [number, number])[];
    if (room.sceneType === 0) bounds = [[72, 79]];
    else if (room.sceneType === 1)
      bounds = [
        [44, 55],
        [72, 79],
        [96, 107],
      ];
    else if (room.sceneType === 4)
      bounds =
        (this._totalFrames & 128) === 0
          ? [
              [44, 61],
              [64, 77],
              [80, 93],
              [96, 107],
            ]
          : [
              [44, 55],
              [64, 71],
              [80, 87],
              [96, 107],
            ];
    else {
      if (!room.pit || room.pit.width === 0) return false;
      const inset = room.pit.x - 48;
      bounds = [[44 + inset, 107 - inset]];
    }
    return bounds.some(([left, right]) => this._x > left && this._x <= right);
  }

  private objectContact(
    room: IPitfallRoom,
  ): 'wall' | 'scorpion' | 'treasure' | 'obstacle' | 'log' | null {
    if (
      room.wall &&
      this._y + 66 + 21 >= 143 &&
      this._x + 7 >= room.wall.x &&
      this._x <= room.wall.x + 7
    )
      return 'wall';
    if (
      room.scorpion &&
      this.pixelHit(
        PitfallSpritePatterns.scorpion[room.scorpion.x & 1] ?? [],
        room.scorpion.x,
        159,
        room.scorpion.facing,
      )
    )
      return 'scorpion';
    if (room.treasure) {
      const pattern =
        room.treasure.kind === 'moneyBag'
          ? PitfallSpritePatterns.moneyBag
          : room.treasure.kind === 'diamond'
            ? PitfallSpritePatterns.ring
            : (PitfallSpritePatterns.bar[(this._randomAnimation >> 4) & 1] ?? []);
      if (this.pixelHit(pattern, room.treasure.x, 111)) return 'treasure';
    }
    if (room.obstacle) {
      const pattern =
        room.obstacle.kind === 'fire'
          ? PitfallSpritePatterns.fire[room.obstacle.animationFrame]
          : PitfallSpritePatterns.cobra[room.obstacle.animationFrame];
      if (this.pixelHit(pattern ?? [], room.obstacle.x, 111)) return 'obstacle';
    }
    if (
      room.logs.some((log) =>
        this.pixelHit(PitfallSpritePatterns.log[log.animationFrame] ?? [], log.x, log.y),
      )
    )
      return 'log';
    return null;
  }

  private pixelHit(
    pattern: readonly number[],
    x: number,
    top: number,
    facing: -1 | 1 = 1,
  ): boolean {
    const harry = PitfallSpritePatterns.harry[this._pattern] ?? PitfallSpritePatterns.harry[5];
    const harryTop = this._y + 66 + this._spriteOffsetY;
    for (let row = 0; row < harry.length; row += 1) {
      const objectRow = harryTop + row - top;
      const mask = pattern[objectRow] ?? 0;
      if (!mask) continue;
      for (let column = 0; column < 8; column += 1) {
        const otherColumn = this._x + column - x;
        if (otherColumn < 0 || otherColumn > 7) continue;
        const harryBit = this._facing === 1 ? 7 - column : column;
        const objectBit = facing === 1 ? 7 - otherColumn : otherColumn;
        if (((harry[row] ?? 0) & (1 << harryBit)) !== 0 && (mask & (1 << objectBit)) !== 0)
          return true;
      }
    }
    return false;
  }

  private resolveContact(
    room: IPitfallRoom,
    contact: ReturnType<PitfallGame['objectContact']>,
  ): boolean {
    this._spriteOffsetY = 0;
    if (contact === 'wall') {
      if (this._y >= 64 && room.wall) {
        const fromLeft = this._x < room.wall.x;
        this._x += fromLeft ? -1 : 1;
        this._jumpDirection = fromLeft ? -1 : 1;
        this.emit('wall');
      }
    } else if (
      !this._godMode &&
      (contact === 'scorpion' || (contact === 'obstacle' && !this._vineAttached))
    ) {
      this.kill();
    } else if (contact === 'treasure' && room.treasure && !this._vineAttached) {
      this._collected.add(room.index);
      this._score += room.treasure.value;
      this.emit('treasure');
      if (this._collected.size === 32) this.finish('won', 'treasures');
    } else if (contact === 'log' && !this._vineAttached) {
      if (this._godMode) return false;
      if (this._climbPosition > 0) this._climbPosition += 1;
      else if (this._y > SURFACE_Y) return false;
      else this._spriteOffsetY = 5;
      this._score = Math.max(0, this._score - 1);
      this.emit('log');
      return room.objectType < 4;
    }
    return false;
  }

  private touchesVine(room: IPitfallRoom): boolean {
    if (!room.vine || this._y >= SURFACE_Y || this._jumpIndex === 0) return false;
    const pattern = PitfallSpritePatterns.harry[this._pattern] ?? PitfallSpritePatterns.harry[5];
    const top = this._y + 66 + this._spriteOffsetY;
    let accumulator = 0;
    let x = 78;
    for (let line = 32; line <= 110 - this._vineBottom; line += 1) {
      accumulator += this._vineSlope;
      if (accumulator > 255) {
        accumulator &= 255;
        x += this._vineDirection;
      }
      const column = x - this._x;
      const mask = pattern[line - top] ?? 0;
      if (
        column >= 0 &&
        column <= 7 &&
        (mask & (1 << (this._facing === 1 ? 7 - column : column))) !== 0
      )
        return true;
    }
    return false;
  }

  private moveVine(): void {
    let slope = ((this._vineHigh << 1) | (this._vineLow >> 7)) & 255;
    if ((slope & 128) !== 0) slope ^= 255;
    this._vineSlope = slope;
    this._vineDirection = (this._vineHigh & 128) !== 0 ? 1 : -1;
    const sum = this._vineLow + ((143 - slope) & 255);
    this._vineLow = sum & 255;
    if (sum > 255) this._vineHigh = (this._vineHigh + 4) & 255;
    const bottom = slope >> 3;
    this._vineBottom = bottom >= 5 ? bottom + 5 : 10;
  }

  private vinePosition(): { anchorX: number; anchorY: number; x: number; y: number } {
    const y = 110 - this._vineBottom;
    return {
      anchorX: 78,
      anchorY: 32,
      x: 78 + this._vineDirection * Math.floor(((y - 31) * this._vineSlope) / 256),
      y,
    };
  }

  private transitionRoom(): boolean {
    if (this._x >= 8 && this._x <= 148) return false;
    const direction = this._x < 8 ? -1 : 1;
    const stride = this._y >= 64 ? 3 : 1;
    this._roomIndex = (this._roomIndex + direction * stride + 255) % 255;
    this._x = direction === 1 ? 8 : 148;
    this._vineAttached = false;
    this.resetRoomObjects();
    return true;
  }

  private selectPattern(direction: number): void {
    if (direction === 0) this._pattern = 5;
    if (this._y === 31) this._pattern = 3;
    else if (this._y !== SURFACE_Y && this._y !== UNDERGROUND_Y)
      this._pattern = this._y > SURFACE_Y && this._y < 60 && this._climbPosition === 0 ? 5 : 0;
    if (this._vineAttached) this._pattern = 6;
    if (this._climbPosition > 0) this._pattern = 7 + (this._climbPosition & 1);
    if (this._spriteOffsetY > 0) this._pattern = 0;
  }

  private kill(): void {
    if (this._godMode) return;
    this._deathFrames = 132;
    this._vx = 0;
    this._vy = 0;
    this._vineAttached = false;
    this._climbPosition = 0;
    this._jumpRequested = false;
    this.emit('death');
  }

  private respawn(): void {
    this._lives -= 1;
    if (this._lives === 0) {
      this.finish('gameOver', 'lives');
      return;
    }
    this._x = 20;
    this._y = this._y >= 71 ? 64 : -33;
    if (this._y === 64) this._scorpionX = 76;
    this._facing = 1;
    this._pattern = 5;
    this._spriteOffsetY = 0;
    this._jumpIndex = 32;
    this._jumpDirection = 0;
    this._jumpReleasedFromVine = false;
  }

  private finish(
    status: 'won' | 'gameOver',
    reason: NonNullable<IPitfallSnapshot['terminalReason']>,
  ): void {
    this._status = status;
    this._terminalReason = reason;
    this.releaseInputs();
  }

  private resetRoomObjects(): void {
    this._objectX = 124;
    this._scorpionX = 76;
    this._scorpionFacing = -1;
  }

  private currentRoom(): IPitfallRoom {
    return createPitfallRoom(
      this._roomIndex,
      this._totalFrames / 60,
      this._collected.has(this._roomIndex),
      {
        objectX: this._objectX,
        scorpionX: this._scorpionX,
        scorpionFacing: this._scorpionFacing,
        animationFrame: (this._randomAnimation >> 4) & 1,
        pitFrame: this._pitFrame,
      },
    );
  }

  private direction(): number {
    return this._inputs.has('left') ? -1 : this._inputs.has('right') ? 1 : 0;
  }

  private emit(kind: IPitfallSoundEvent['kind']): void {
    this._eventId += 1;
    this._soundEvents.push({ id: this._eventId, kind });
  }

  // #endregion
}
