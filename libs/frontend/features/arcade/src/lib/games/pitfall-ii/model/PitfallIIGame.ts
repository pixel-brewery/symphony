// #region Imports

import type { IPitfallIISnapshot } from './IPitfallIISnapshot';
import type { IPitfallIISoundEvent } from './IPitfallIISoundEvent';
import type { PitfallIIInput } from './PitfallIIInput';
import { PitfallIIWorld } from './PitfallIIWorld';
import { getPitfallIIPlayerSprite } from './getPitfallIIPlayerSprite';
import { PitfallIISpritePatterns } from './PitfallIISpritePatterns';
import { pitfallIISpritesOverlap } from './pitfallIISpritesOverlap';

// #endregion

const FRAME_MILLISECONDS = 1000 / 60;
const PLAYER_WIDTH = 8;
const PLAYER_HEIGHT = 22;
// Original NTSC bank0 $DC86 jump deltas (screen y increases downward).
const JUMP_DELTAS = [
  -1, -1, -1, -1, -1, -1, 0, -1, 0, 0, -1, 0, 0, 0, -1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1,
  1, 1,
] as const;
const AWARDS = { gold: 5000, rat: 15000, diamond: 20000, rhonda: 10000, quickclaw: 10000 } as const;

/**
 * Deterministic complete-cavern Atari 2600 rules, at 60 simulation frames per second.
 * Map pixels and manual rules are cross-checked with the NTSC cartridge routines.
 * Jump, swimming, ladder, balloon and return cadences follow the original logical frames;
 * rendering remains independent of a cycle-exact 6502/TIA emulator.
 * @public
 */
export class PitfallIIGame {
  // #region Fields

  private _status: IPitfallIISnapshot['status'] = 'ready';
  private _resumeStatus: 'ready' | 'playing' | 'returning' = 'ready';
  private _x = 36;
  private _y = 120;
  private _vx = 0;
  private _vy = 0;
  private _facing: -1 | 1 = 1;
  private _score = 4000;
  private _checkpointId = 0;
  private _totalFrames = 0;
  private _displayFrames = 0;
  private _accumulator = 0;
  private _cameraY = 0;
  private _inputs = new Set<PitfallIIInput>();
  private _collected = new Set<string>();
  private _jumpRequested = false;
  private _jumping = false;
  private _jumpFrame = 0;
  private _jumpDirection: -1 | 0 | 1 = 0;
  private _fallPending = false;
  private _climbing = false;
  private _swimming = false;
  private _balloonAttached = false;
  private _balloonVisible = false;
  private _balloonFloorY = 0;
  private _balloonX = 768;
  private _balloonY = 1260;
  private _balloonSourceId: number | null = null;
  private _balloonReleased = false;
  private _rewardFrames = 0;
  private _ratX = 192;
  private _hazardX: number[] = [];
  private _hazardFacing: (-1 | 1)[] = [];
  private _activeHazards = new Set<number>();
  private _hazardChamber = -1;
  private _returnDelay = 0;
  private _invulnerableFrames = 0;
  private _godMode = false;
  private _eventId = 0;
  private _soundEvents: IPitfallIISoundEvent[] = [];

  // #endregion

  // #region Properties

  /** Immutable snapshot, with global x-left/y-feet coordinates and the complete static world. @public @readonly */
  public get snapshot(): IPitfallIISnapshot {
    const chamber = Math.min(7, Math.max(0, Math.floor((this._x + 4) / 160)));
    const objectives = this.objectives();
    return {
      status: this._status,
      score: this._score,
      elapsed: this._totalFrames / 60,
      totalFrames: this._totalFrames,
      displayFrames: this._displayFrames,
      frame: this._displayFrames & 255,
      chamber,
      level: Math.min(27, Math.max(0, Math.ceil((this._y - 120) / 45))),
      goldCollected: PitfallIIWorld.items.filter(
        (item) => item.kind === 'gold' && this._collected.has(item.id),
      ).length,
      totalGold: 28,
      objectives,
      camera: { x: chamber * 160, y: this._cameraY, width: 160, height: 192 },
      player: {
        x: this._x,
        y: this._y,
        vx: this._vx,
        vy: this._vy,
        facing: this._facing,
        pose:
          this._status === 'won'
            ? 'celebrate'
            : this._status === 'returning'
              ? 'hurt'
              : this._balloonAttached
                ? 'balloon'
                : this._climbing
                  ? 'climb'
                  : this._swimming
                    ? 'swim'
                    : this._jumping || this._vy !== 0
                      ? 'jump'
                      : this._vx !== 0 || this.direction() !== 0
                        ? 'run'
                        : 'idle',
        animationFrame: Math.floor(this._displayFrames / 6),
        invulnerable: this._godMode || this._invulnerableFrames > 0,
      },
      platforms: PitfallIIWorld.platforms,
      walls: PitfallIIWorld.walls,
      ladders: PitfallIIWorld.ladders,
      water: PitfallIIWorld.water,
      checkpoints: PitfallIIWorld.checkpoints,
      checkpointId: this._checkpointId,
      items: PitfallIIWorld.items.map((item) => ({
        ...item,
        x: item.kind === 'rat' ? this._ratX : item.x,
        collected: this._collected.has(item.id),
      })),
      hazards: this.hazards(),
      balloon: {
        visible: this._balloonVisible,
        x: this._balloonX,
        y: this._balloonY,
        attached: this._balloonAttached,
      },
      soundEvents: this._soundEvents,
      music:
        this._status === 'won'
          ? 'victory'
          : this._status === 'returning'
            ? 'return'
            : this._rewardFrames > 0
              ? 'reward'
              : this._balloonAttached
                ? 'balloon'
                : 'adventure',
    };
  }

  // #endregion

  // #region Methods

  /** Restores the starting cross, all 32 pickups and the 4000-point advance. @public */
  public startNewGame(): void {
    this._status = 'ready';
    this._resumeStatus = 'ready';
    this._x = 36;
    this._y = 120;
    this._vx = 0;
    this._vy = 0;
    this._facing = 1;
    this._score = 4000;
    this._checkpointId = 0;
    this._totalFrames = 0;
    this._displayFrames = 0;
    this._accumulator = 0;
    this._cameraY = 0;
    this._collected.clear();
    this._jumping = false;
    this._fallPending = false;
    this._climbing = false;
    this._swimming = false;
    this._balloonAttached = false;
    this._balloonVisible = false;
    this._balloonFloorY = 0;
    this._balloonReleased = false;
    this._balloonX = 768;
    this._balloonY = 1260;
    this._balloonSourceId = null;
    this._rewardFrames = 0;
    this._ratX = 192;
    this._hazardX = [];
    this._hazardFacing = [];
    this._activeHazards.clear();
    this._hazardChamber = -1;
    this._returnDelay = 0;
    this._invulnerableFrames = 0;
    this._soundEvents = [];
    this.releaseInputs();
  }

  /** Applies the joystick or fire button; like the cartridge, a direction starts action. @public */
  public setInput(input: PitfallIIInput, active: boolean): void {
    if (!active) {
      this._inputs.delete(input);
      if (input === 'jump') this._jumpRequested = false;
      return;
    }
    if (this._status === 'paused' || this._status === 'won' || this._status === 'returning') return;
    if (this._status === 'ready' && input !== 'jump') this._status = 'playing';
    if (input === 'jump' && !this._inputs.has(input) && this._status === 'playing')
      this._jumpRequested = true;
    this._inputs.add(input);
  }

  /** Clears held host controls while preserving airborne motion. @public */
  public releaseInputs(): void {
    this._inputs.clear();
    this._jumpRequested = false;
    this._vx = 0;
  }

  /** Freezes all simulation clocks and releases keyboard controls. @public */
  public pause(): void {
    if (this._status === 'paused' || this._status === 'won') return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this.releaseInputs();
  }

  /** Resumes the exact prior phase or pauses the expedition. @public */
  public togglePause(): void {
    if (this._status === 'paused') this._status = this._resumeStatus;
    else this.pause();
  }

  /** Advances fixed 60Hz frames, with bounded host gaps and retained fractional time. @public */
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
      if (this._status === 'playing' || this._status === 'returning') {
        this._totalFrames += 1;
        this.advanceFrame();
        if (this._y - this._cameraY > 127) this._cameraY = this._y - 127;
        else if (this._y - this._cameraY < 48) this._cameraY = this._y - 48;
        this._cameraY = Math.min(1221, Math.max(0, this._cameraY));
      }
    }
  }

  /** Enables the shared session-only invulnerability adaptation. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
    if (enabled && this._status === 'returning') this.finishReturn();
  }

  /** Places Harry for deterministic simulation/replay checks without exposing a UI teleport. @public */
  public placePlayer(x: number, y: number): void {
    this._x = Math.min(1272, Math.max(0, x));
    this._y = Math.min(1380, Math.max(0, y));
    this._cameraY = Math.min(1221, Math.max(0, this._y - 127));
    this._vx = 0;
    this._vy = 0;
    this._jumping = false;
    this._fallPending = false;
    this._climbing = false;
    this._swimming = false;
    this._balloonAttached = false;
    this._balloonVisible = false;
    this._balloonFloorY = 0;
    this._balloonReleased = false;
    this._status = 'playing';
    this.releaseInputs();
  }

  private advanceFrame(): void {
    if (this._status === 'returning') {
      this.advanceReturn();
      return;
    }
    if (this._rewardFrames > 0) this._rewardFrames -= 1;
    if (this._invulnerableFrames > 0) this._invulnerableFrames -= 1;
    if (this._y > 145 && this._y < 174 && this._x >= 160 && this._x < 320)
      this._ratX = Math.min(308, this._ratX + 2);
    this.advanceHazards();
    this.advanceBalloon();
    if (this._balloonAttached) this.moveWithBalloon();
    else this.movePlayer();
    this.collectCheckpoints();
    this.collectItems();
    if (this._status !== 'won') this.collideHazards();
  }

  private direction(): -1 | 0 | 1 {
    return (Number(this._inputs.has('right')) - Number(this._inputs.has('left'))) as -1 | 0 | 1;
  }

  private movePlayer(): void {
    const direction = this.direction();
    if (direction !== 0) this._facing = direction;
    const water = PitfallIIWorld.water.find(
      (area) =>
        this._x + 4 >= area.x &&
        this._x + 4 < area.x + area.width &&
        this._y > area.y + 3 &&
        this._y - 5 < area.y + area.height,
    );
    if (water && !this._climbing) {
      if (!this._swimming) this.emit('splash');
      this._swimming = true;
      this._jumping = false;
      this._fallPending = false;
      this._balloonReleased = false;
      const tick = this._totalFrames % 4 === 0;
      const oscillation = (this._totalFrames >> 2) & 7;
      const target = water.y + 9 + (oscillation < 4 ? oscillation : 7 - oscillation);
      this._vy = !tick ? 0 : this._inputs.has('down') ? 1 : Math.sign(target - this._y);
      this._y = Math.max(water.y + 7, Math.min(water.y + water.height, this._y + this._vy));
      this.moveHorizontal(tick ? direction : 0);
      this.tryClimb();
      if (direction !== 0 && this._y < water.y + 15) {
        const shore = PitfallIIWorld.platforms.find(
          (platform) =>
            platform.y >= water.y - 12 &&
            platform.y <= water.y &&
            this._x + 4 >= platform.x &&
            this._x + 4 < platform.x + platform.width,
        );
        if (shore) {
          this.land(shore.y);
          this._swimming = false;
        }
      }
      this._jumpRequested = false;
      return;
    }
    this._swimming = false;
    this.tryClimb();
    if (this._climbing) {
      const ladder = this.currentLadder();
      if (!ladder) this._climbing = false;
      else {
        const vertical = Number(this._inputs.has('down')) - Number(this._inputs.has('up'));
        this._vy = this._totalFrames % 8 === 0 ? vertical * 4 : 0;
        this._y = Math.max(ladder.y, Math.min(ladder.y + ladder.height, this._y + this._vy));
        this._vx = 0;
        if (direction !== 0 && (this.nearFloor() || this._jumpRequested)) {
          this._climbing = false;
          this._x += direction * 6;
        } else if (vertical < 0 && this._y === ladder.y) {
          this._climbing = false;
          this._x = ladder.x - 10;
          this._vy = 0;
        } else if (
          vertical > 0 &&
          this._y === ladder.y + ladder.height &&
          !this.nextLadder(ladder.y + ladder.height)
        ) {
          this._climbing = false;
        }
        this._jumpRequested = false;
        return;
      }
    }
    const standing = this.floorAt(this._x + 4, this._y);
    if (this._jumpRequested && standing && !this._jumping) {
      this._jumping = true;
      this._jumpFrame = 0;
      this._jumpDirection = direction;
      this._vy = -1;
      this._fallPending = false;
      this.emit('jump');
    }
    this._jumpRequested = false;
    // $D5F3: a held diagonal jump keeps its latched direction; an accidental fall
    // only accepts the live joystick on frame&127==0 (the manual's slow cave wind).
    const movingDirection = this._jumping
      ? this._jumpDirection
      : this._fallPending && !standing && (this._totalFrames & 127) !== 0
        ? 0
        : direction;
    this.moveHorizontal(this._totalFrames % 2 === 0 ? movingDirection : 0);
    if (!this.floorAt(this._x + 4, this._y) || this._jumping || this._vy < 0) {
      if (!this._jumping && !this._fallPending && !this._balloonReleased) {
        this._fallPending = true;
      }
      const previousY = this._y;
      this._vy =
        this._jumping && this._jumpFrame < JUMP_DELTAS.length
          ? (JUMP_DELTAS[this._jumpFrame] ?? 1)
          : 1;
      if (
        this._jumping &&
        this._jumpDirection === 0 &&
        this._x >= 640 &&
        this._x < 800 &&
        this._y >= 345 &&
        this._jumpFrame < 24
      )
        this._vy = -1;
      if (this._jumping) this._jumpFrame += 1;
      this._y += this._vy;
      if (this._vy >= 0) {
        const floor = PitfallIIWorld.platforms.find(
          (platform) =>
            this._x + 4 >= platform.x &&
            this._x + 4 < platform.x + platform.width &&
            previousY <= platform.y &&
            this._y >= platform.y,
        );
        if (floor) this.land(floor.y);
      }
      this.catchBalloon();
    } else {
      this._vy = 0;
      this._fallPending = false;
    }
  }

  private moveHorizontal(delta: number): void {
    this._vx = delta;
    const desired = Math.max(0, Math.min(1272, this._x + delta));
    const wall = PitfallIIWorld.walls.find(
      (value) =>
        this._y > value.y &&
        this._y - PLAYER_HEIGHT < value.y + value.height &&
        desired + PLAYER_WIDTH > value.x &&
        desired < value.x + value.width,
    );
    if (wall) this._x = delta > 0 ? wall.x - PLAYER_WIDTH : wall.x + wall.width;
    else this._x = desired;
  }

  private floorAt(x: number, y: number): boolean {
    return PitfallIIWorld.platforms.some(
      (platform) =>
        Math.abs(y - platform.y) < 0.01 && x >= platform.x && x < platform.x + platform.width,
    );
  }

  private nearFloor(): boolean {
    return PitfallIIWorld.platforms.some(
      (platform) =>
        Math.abs(this._y - platform.y) < 2 &&
        this._x + 16 >= platform.x &&
        this._x - 8 < platform.x + platform.width,
    );
  }

  private land(y: number): void {
    if (this._fallPending) {
      this._score = Math.max(0, this._score - (this._godMode ? 0 : 100));
      this.emit('fall');
    }
    this._y = y;
    this._vy = 0;
    this._jumping = false;
    this._fallPending = false;
    this._balloonReleased = false;
  }

  private currentLadder(): (typeof PitfallIIWorld.ladders)[number] | undefined {
    const down = this._inputs.has('down');
    return PitfallIIWorld.ladders.find(
      (ladder) =>
        Math.abs(this._x + 4 - ladder.x) < 10 &&
        this._y >= ladder.y - 1 &&
        this._y <= ladder.y + ladder.height + 1 &&
        !(
          down &&
          Math.abs(this._y - ladder.y - ladder.height) < 0.1 &&
          this.nextLadder(ladder.y + ladder.height)
        ),
    );
  }

  private nextLadder(y: number): boolean {
    return PitfallIIWorld.ladders.some(
      (ladder) => Math.abs(ladder.x - this._x - 4) < 10 && ladder.y === y,
    );
  }

  private tryClimb(): void {
    if (this._climbing || (!this._inputs.has('up') && !this._inputs.has('down'))) return;
    const ladder = this.currentLadder();
    if (!ladder) return;
    if (this._inputs.has('up') && this._y <= ladder.y + 0.1) return;
    if (
      this._inputs.has('down') &&
      this._y >= ladder.y + ladder.height - 0.1 &&
      !this.nextLadder(ladder.y + ladder.height)
    )
      return;
    this._climbing = true;
    this._swimming = false;
    this._jumping = false;
    this._fallPending = false;
    this._x = ladder.x - 4;
    this._vy = 0;
  }

  private advanceBalloon(): void {
    if (this._balloonAttached || !this._balloonVisible) return;
    if (this._totalFrames % 2 === 0) this._balloonX += 1;
    if (this._balloonX >= 800) this._balloonX = 640;
    const phase = (this._totalFrames >> 1) & 30;
    this._balloonY = this._balloonFloorY + 8 + (phase >= 16 ? phase ^ 30 : phase);
  }

  private catchBalloon(): void {
    if (!this._balloonVisible || !this._jumping || this._balloonReleased) return;
    if (Math.abs(this._x - this._balloonX) < 9 && Math.abs(this._y - this._balloonY - 33) < 7) {
      this._balloonAttached = true;
      this._climbing = false;
      this._jumping = false;
      this._vy = 0;
      this.emit('balloon');
    }
  }

  private moveWithBalloon(): void {
    const speed = this._inputs.has('up')
      ? 1
      : this._inputs.has('down')
        ? Number(this._totalFrames % 4 === 0)
        : Number(this._totalFrames % 2 === 0);
    this._balloonX = Math.max(
      642,
      Math.min(782, this._balloonX + (this._totalFrames % 2 === 0 ? this.direction() : 0)),
    );
    this._balloonY = Math.max(321, this._balloonY - speed);
    this._x = this._balloonX;
    this._y = this._balloonY + 33;
    this._vx = this._totalFrames % 2 === 0 ? this.direction() : 0;
    this._vy = -speed;
    this._jumpRequested = false;
    const bat = this.hazards().find(
      (hazard) =>
        (hazard.kind === 'bat' || hazard.kind === 'balloonBat') &&
        Math.abs(hazard.x - this._balloonX) < 10 &&
        Math.abs(hazard.y - this._balloonY) < 10,
    );
    if (bat) {
      this._balloonAttached = false;
      this._balloonVisible = false;
      this._balloonReleased = true;
      this._jumping = true;
      this._jumpFrame = JUMP_DELTAS.length;
      this._jumpDirection = this.direction();
      this._vy = 0;
      this._balloonY = 1300;
      this.emit('pop');
    }
  }

  private collectCheckpoints(): void {
    if (this._balloonAttached) return;
    const checkpoint = PitfallIIWorld.checkpoints.find(
      (cross) => Math.abs(cross.x - this._x) < 8 && Math.abs(cross.y - this._y) < 7,
    );
    if (checkpoint && checkpoint.id !== this._checkpointId) {
      this._checkpointId = checkpoint.id;
      this.emit('checkpoint');
    }
  }

  private collectItems(): void {
    for (const item of PitfallIIWorld.items) {
      const x = item.kind === 'rat' ? this._ratX : item.x;
      if (
        this._collected.has(item.id) ||
        Math.abs(x - this._x) > 8 ||
        Math.abs(item.y - this._y) > 12
      )
        continue;
      // Original $D5B6 blocks Harry on the rat's right; catch it from behind on its left.
      if (item.kind === 'rat' && this._x > x) {
        this.moveHorizontal(1);
        return;
      }
      if (item.kind === 'rat' && this._ratX < 308) continue;
      this._collected.add(item.id);
      this._score += AWARDS[item.kind];
      this._rewardFrames = 180;
      this.emit('treasure');
      const objectives = this.objectives();
      if (objectives.rhonda && objectives.quickclaw && objectives.diamond) {
        this._status = 'won';
        this._balloonAttached = false;
        this.releaseInputs();
        this._vy = 0;
        this.emit('victory');
        return;
      }
    }
  }

  private objectives(): IPitfallIISnapshot['objectives'] {
    const has = (kind: string): boolean =>
      PitfallIIWorld.items.some((item) => item.kind === kind && this._collected.has(item.id));
    return {
      rhonda: has('rhonda'),
      quickclaw: has('quickclaw'),
      diamond: has('diamond'),
      rat: has('rat'),
    };
  }

  private initialHazardX(kind: IPitfallIISnapshot['hazards'][number]['kind']): number {
    return kind === 'scorpion' ? 64 : kind === 'condor' ? 136 : kind === 'frog' ? 76 : 32;
  }

  private advanceHazards(): void {
    const chamber = Math.floor((this._x + 4) / 160);
    if (chamber !== this._hazardChamber) {
      this._activeHazards.clear();
      this._hazardChamber = chamber;
      if (!this._balloonAttached) {
        this._balloonVisible = false;
        this._balloonSourceId = null;
      }
    }
    const active = new Set<number>();
    const topLevel = Math.max(0, Math.floor((this._y - 120) / 45) - 2);
    for (const spawn of PitfallIIWorld.hazards) {
      const floorY =
        spawn.y +
        (spawn.kind === 'bat' || spawn.kind === 'balloonBat' || spawn.kind === 'condor' ? 22 : 0);
      const level = Math.round((floorY - 120) / 45);
      if (Math.floor(spawn.x / 160) !== chamber || level < topLevel || level > topLevel + 4)
        continue;
      active.add(spawn.id);
      if (spawn.id === this._balloonSourceId) continue;
      if (!this._activeHazards.has(spawn.id)) {
        this._hazardX[spawn.id] = this.initialHazardX(spawn.kind);
        this._hazardFacing[spawn.id] = spawn.kind === 'condor' ? -1 : 1;
      }
      // $D9D2 updates alternate entries in the cartridge's five-floor display window.
      if (((level - topLevel) & 1) === (this._totalFrames & 1)) continue;
      if (spawn.kind === 'frog') continue;
      if (spawn.kind === 'scorpion') {
        if ((this._totalFrames & 2) !== 0) continue;
        if (!this._jumping && Math.abs(this._y - floorY) < 1) {
          this._hazardFacing[spawn.id] =
            (this._hazardX[spawn.id] ?? 64) + chamber * 160 < this._x ? 1 : -1;
        }
      }
      const facing = this._hazardFacing[spawn.id] ?? 1;
      const x = (this._hazardX[spawn.id] ?? this.initialHazardX(spawn.kind)) + facing;
      this._hazardX[spawn.id] = x < 0 || x >= 160 ? 0 : x;
      if (x < 0 || x >= 160) {
        this._hazardFacing[spawn.id] = 1;
        // $DADF: one central-shaft bat wraps, becomes the free specimen bag,
        // then disappears from the object slots when Harry catches its string.
        if (
          spawn.kind === 'balloonBat' &&
          !this._balloonVisible &&
          !this._balloonAttached &&
          Math.abs(this._y - floorY - 45) < 18
        ) {
          this._balloonVisible = true;
          this._balloonSourceId = spawn.id;
          this._balloonFloorY = floorY;
          this._balloonX = 640;
        }
      }
    }
    this._activeHazards = active;
  }

  private hazards(): IPitfallIISnapshot['hazards'] {
    const frame = this._totalFrames & 255;
    return PitfallIIWorld.hazards
      .filter((spawn) => spawn.id !== this._balloonSourceId)
      .map((spawn) => {
        const chamber = Math.floor(spawn.x / 160) * 160;
        let x = chamber + (this._hazardX[spawn.id] ?? this.initialHazardX(spawn.kind));
        let y = spawn.y;
        let facing = this._hazardFacing[spawn.id] ?? (spawn.kind === 'condor' ? -1 : 1);
        const animationMask = spawn.kind === 'condor' ? 16 : spawn.kind === 'frog' ? 64 : 8;
        if (spawn.kind === 'bat' || spawn.kind === 'balloonBat' || spawn.kind === 'eel') {
          const phase = (frame >> 1) & 30;
          y += phase >= 16 ? phase ^ 30 : phase;
        } else if (spawn.kind === 'condor') {
          const phase = (frame >> 1) & 62;
          y += (phase >= 32 ? phase ^ 62 : phase) - 8;
        } else if (spawn.kind === 'frog') {
          let vertical = frame & 127;
          if (vertical >= 64) vertical = 0;
          if (vertical >= 32) vertical ^= 63;
          y -= (vertical ^ 31) & 30;
          let horizontal = frame & 127;
          if (horizontal >= 64) horizontal = 63;
          if ((frame & 128) === 0) horizontal ^= 63;
          x = chamber + 68 + (horizontal >> 2);
          facing = ((frame - 96) & 128) === 0 ? 1 : -1;
        }
        if (spawn.kind === 'eel') y = (spawn.y >= 1335 ? 1348 : 226) + y - spawn.y;
        return { ...spawn, x, y, facing, frame: (frame & animationMask) === 0 ? 1 : 0 };
      });
  }

  private collideHazards(): void {
    if (this._godMode || this._invulnerableFrames > 0 || this._status !== 'playing') return;
    const player = this.snapshot.player;
    const rows = getPitfallIIPlayerSprite(player);
    for (const hazard of this.hazards()) {
      const patterns =
        hazard.kind === 'balloonBat'
          ? PitfallIISpritePatterns.bat
          : PitfallIISpritePatterns[hazard.kind];
      const pattern = patterns[hazard.frame % 2] ?? [];
      const ground = hazard.kind === 'scorpion' || hazard.kind === 'frog';
      if (
        pitfallIISpritesOverlap(
          { rows, x: player.x, y: player.y - rows.length + 6, mirrored: player.facing === -1 },
          {
            rows: pattern,
            x: hazard.x,
            y: hazard.y - pattern.length + (ground ? 4 : 0),
            mirrored: hazard.kind === 'condor' ? hazard.facing === 1 : hazard.facing === -1,
          },
        )
      ) {
        this.beginReturn();
        return;
      }
    }
  }

  private beginReturn(): void {
    this._status = 'returning';
    this._returnDelay = 128;
    this._balloonAttached = false;
    this._climbing = false;
    this._swimming = false;
    this._jumping = false;
    this._rewardFrames = 0;
    this.releaseInputs();
    this._vy = 0;
    this.emit('hurt');
  }

  private advanceReturn(): void {
    if (this._returnDelay > 0) {
      this._returnDelay -= 1;
      return;
    }
    const checkpoint = PitfallIIWorld.checkpoints[this._checkpointId];
    if (!checkpoint) return;
    const dx = checkpoint.x - this._x;
    const dy = checkpoint.y - this._y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      this.finishReturn();
      return;
    }
    this._x += Math.sign(dx) * Math.min(1, Math.abs(dx));
    this._y += Math.sign(dy) * Math.min(1, Math.abs(dy));
    // Deduction accompanies travel, including at zero score; there is no lives counter.
    this._score = Math.max(0, this._score - 7);
  }

  private finishReturn(): void {
    const checkpoint = PitfallIIWorld.checkpoints[this._checkpointId];
    if (!checkpoint) return;
    this._x = checkpoint.x;
    this._y = checkpoint.y;
    this._status = 'playing';
    this._fallPending = false;
    this._invulnerableFrames = 90;
    this._vy = 0;
    this._vx = 0;
  }

  private emit(kind: IPitfallIISoundEvent['kind']): void {
    this._eventId += 1;
    this._soundEvents.push({ id: this._eventId, kind, frame: this._totalFrames });
  }

  // #endregion
}
