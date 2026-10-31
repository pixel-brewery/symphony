// #region Imports

import type { IJungleHuntOptions } from './IJungleHuntOptions';
import type { IJungleHuntSnapshot } from './IJungleHuntSnapshot';
import type { IJungleHuntSoundEvent } from './IJungleHuntSoundEvent';
import type { JungleHuntInput } from './JungleHuntInput';

// #endregion

const FRAME = 1000 / 60;
const FLOOR = 163;
const VINE_COUNT = 11;
const RIVER_END = -1120;
const BOULDER_END = -1220;

/** Deterministic cartridge-rules simulation of all four Jungle Hunt stages. @public */
export class JungleHuntGame {
  // #region Fields

  private _options: IJungleHuntOptions = { skill: 1 };
  private _status: IJungleHuntSnapshot['status'] = 'ready';
  private _resumeStatus: IJungleHuntSnapshot['status'] = 'playing';
  private _stage: IJungleHuntSnapshot['stage'] = 'vines';
  private _frame = 0;
  private _stageFrame = 0;
  private _elapsedFrames = 0;
  private _timerFrames = 500 * 60;
  private _airFrames = 20 * 60;
  private _score = 0;
  private _lives = 5;
  private _level = 1;
  private _rescues = 0;
  private _extraLifeAwarded = false;
  private _godMode = false;
  private _outcome: IJungleHuntSnapshot['outcome'] = null;
  private _accumulator = 0;
  private _delay = 0;
  private _x = 132;
  private _y = 104;
  private _velocityX = 0;
  private _velocityY = 0;
  private _facing: -1 | 1 = -1;
  private _vine: number | null = 0;
  private _lastVine = 0;
  private _jumpFrames = 0;
  private _knifeFrames = 0;
  private _knifeCooldown = 0;
  private _firePressed = false;
  private _pose: IJungleHuntSnapshot['player']['pose'] = 'swing';
  private readonly _held = new Set<JungleHuntInput>();
  private readonly _collectedVines = new Set<number>();
  private readonly _killedCrocodiles = new Set<number>();
  private readonly _passedBoulders = new Set<number>();
  private readonly _boulderStrategies = new Map<number, number>();
  private readonly _passedGuards = new Set<number>();
  private _soundId = 0;
  private _sounds: IJungleHuntSoundEvent[] = [];

  // #endregion

  // #region Properties

  /** Returns a detached frame so consumers cannot change gameplay. @public */
  public get snapshot(): IJungleHuntSnapshot {
    return {
      status: this._status,
      stage: this._stage,
      options: { ...this._options },
      frame: this._frame,
      elapsed: this._elapsedFrames / 60,
      score: this._score,
      lives: this._lives,
      timer: Math.max(0, Math.ceil(this._timerFrames / 60)),
      timerValue: Math.max(0, Math.ceil(this._timerFrames / 6)),
      air: Math.max(0, this._airFrames / 1200),
      level: this._level,
      rescues: this._rescues,
      godMode: this._godMode,
      outcome: this._outcome,
      cameraX: this._stage === 'rescue' ? 0 : Math.min(0, this._x - 114),
      progress:
        this._stage === 'vines'
          ? this._lastVine
          : this._stage === 'river'
            ? this._killedCrocodiles.size
            : this._stage === 'boulders'
              ? this._passedBoulders.size
              : this._passedGuards.size,
      player: {
        x: this._x,
        y: this._y,
        velocityY: this._velocityY,
        facing: this._facing,
        pose: this._pose,
        vine: this._vine,
        knifeFrames: this._knifeFrames,
      },
      vines: this.vines(),
      crocodiles: this.crocodiles(),
      boulders: this.boulders(),
      guards: this.guards(),
      soundEvents: this._sounds.map((event) => ({ ...event })),
    };
  }

  private get difficulty(): number {
    return Math.min(8, this._level - 1 + (this._options.skill === 2 ? 2 : 0));
  }

  // #endregion

  // #region Methods

  /** Starts a new single-player run with the selected cartridge skill. @public */
  public startNewGame(options: IJungleHuntOptions = { skill: 1 }): void {
    this._options = { skill: options.skill === 2 ? 2 : 1 };
    this._status = 'playing';
    this._frame = 0;
    this._elapsedFrames = 0;
    this._timerFrames = 500 * 60;
    this._score = 0;
    this._lives = 5;
    this._level = 1;
    this._rescues = 0;
    this._extraLifeAwarded = false;
    this._outcome = null;
    this._accumulator = 0;
    this._sounds = [];
    this.releaseInputs();
    this.enterStage('vines');
    this.sound('start');
  }

  /** Sets a joystick switch; fire uses an edge for jumps and repeat strokes underwater. @public */
  public setInput(input: JungleHuntInput, active: boolean): void {
    if (active) {
      if (!this._held.has(input) && input === 'fire') this._firePressed = true;
      this._held.add(input);
    } else this._held.delete(input);
  }

  /** Clears physical switch state after menus, blur and route disposal. @public */
  public releaseInputs(): void {
    this._held.clear();
    this._firePressed = false;
  }

  /** Makes hazards non-lethal while preserving ordinary controls and stage rules. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
  }

  /** Suspends even a death, rescue or inter-stage animation without losing its state. @public */
  public pause(): void {
    if (this._status === 'paused' || this._status === 'ready' || this._status === 'gameOver')
      return;
    this._resumeStatus = this._status;
    this._status = 'paused';
    this.releaseInputs();
    this._accumulator = 0;
  }

  /** Restores exactly the phase that was paused. @public */
  public togglePause(): void {
    if (this._status === 'paused') this._status = this._resumeStatus;
    else this.pause();
  }

  /** Finalizes an explicitly ended run; ordinary menu navigation only pauses. @public */
  public endGame(): void {
    if (this._status === 'ready' || this._status === 'gameOver') return;
    this.finishGame(this._rescues > 0 ? 'completed' : 'lost');
  }

  private finishGame(outcome: 'lost' | 'completed'): void {
    this._status = 'gameOver';
    this._outcome = outcome;
    this.releaseInputs();
    this.sound('gameOver');
  }

  /** Advances the fixed 60 Hz simulation with a bounded catch-up after a stalled frame. @public */
  public step(elapsedMilliseconds: number): void {
    if (
      !Number.isFinite(elapsedMilliseconds) ||
      elapsedMilliseconds <= 0 ||
      this._status === 'paused' ||
      this._status === 'ready' ||
      this._status === 'gameOver'
    )
      return;
    this._accumulator += Math.min(250, elapsedMilliseconds);
    while (this._accumulator + 1e-7 >= FRAME) {
      this._accumulator -= FRAME;
      this.tick();
      if (this.snapshot.status === 'gameOver') break;
    }
  }

  private tick(): void {
    this._frame++;
    if (this._status !== 'playing') {
      if (--this._delay > 0) return;
      if (this._status === 'dying') {
        if (this._lives === 0) this.finishGame('lost');
        else {
          this.enterStage(this._stage);
          this._status = 'playing';
        }
      } else if (this._status === 'rescued') {
        this._level++;
        this._timerFrames = 500 * 60;
        this.enterStage('vines');
        this._status = 'playing';
      } else if (this._status === 'transition') {
        this.enterStage(
          this._stage === 'vines' ? 'river' : this._stage === 'river' ? 'boulders' : 'rescue',
        );
        this._status = 'playing';
      }
      return;
    }
    this._stageFrame++;
    this._elapsedFrames++;
    if (!this._godMode && --this._timerFrames <= 0) {
      this._timerFrames = 0;
      this.finishGame('lost');
      return;
    }
    switch (this._stage) {
      case 'vines':
        this.stepVines();
        break;
      case 'river':
        this.stepRiver();
        break;
      case 'boulders':
        this.stepGround();
        this.stepBoulders();
        break;
      case 'rescue':
        this.stepGround();
        this.stepRescue();
        break;
    }
    this._firePressed = false;
  }

  private vines(): IJungleHuntSnapshot['vines'] {
    return Array.from({ length: VINE_COUNT }, (_, id) => {
      const x = 135 - id * 61;
      const phase =
        this._stageFrame * (0.018 + (id % 3) * 0.003 + this.difficulty * 0.0018) + id * 1.31;
      const angle = Math.sin(phase) * (0.53 + (id % 2) * 0.06);
      return { id, x, y: 49, tipX: x + Math.sin(angle) * 65, tipY: 49 + Math.cos(angle) * 65 };
    });
  }

  private stepVines(): void {
    const vines = this.vines();
    if (this._vine !== null) {
      const vine = vines[this._vine];
      if (!vine) return;
      this._x = vine.tipX;
      this._y = vine.tipY - 2;
      this._pose = 'swing';
      if (!this._firePressed) return;
      this._lastVine = this._vine;
      this._vine = null;
      this._velocityX = -1.28;
      this._velocityY = -1.7;
      this._jumpFrames = 0;
      this._pose = 'jump';
      this.sound('jump');
    }
    this._jumpFrames++;
    this._x += this._velocityX;
    this._y += this._velocityY;
    this._velocityY += 0.065;
    const next = vines[this._lastVine + 1];
    if (
      next &&
      this._jumpFrames > 5 &&
      Math.abs(this._x - next.tipX) < 8 &&
      this._y + 4 >= next.tipY - 28 &&
      this._y <= next.tipY + 8
    ) {
      this._vine = next.id;
      this._lastVine = next.id;
      if (!this._collectedVines.has(next.id)) {
        this._collectedVines.add(next.id);
        this.addScore(100);
      }
      this.sound('vine');
    } else if (!next && this._x < (vines[VINE_COUNT - 1]?.x ?? -475) - 44) this.finishSection();
    else if (this._y > 170) {
      if (this._godMode) {
        this._vine = this._lastVine;
        this._y = 105;
        this._velocityY = 0;
      } else this.loseLife();
    }
  }

  private crocodiles(): IJungleHuntSnapshot['crocodiles'] {
    return Array.from({ length: 14 }, (_, id) => {
      const rogue = id === 6 || id === 13;
      const group = Math.floor(id / 3);
      const x = 46 - id * 81 + this._stageFrame * (0.09 + this.difficulty * 0.015);
      const y = rogue ? 113 + Math.sin(this._stageFrame * 0.037 + id) * 23 : 92 + (group % 3) * 24;
      const mouth = (Math.floor(
        (this._stageFrame + id * 39) / Math.max(20, 58 - this.difficulty * 4),
      ) % 3) as 0 | 1 | 2;
      return { id, x, y, mouth, rogue, alive: !this._killedCrocodiles.has(id) };
    });
  }

  private stepRiver(): void {
    const horizontal = Number(this._held.has('right')) - Number(this._held.has('left'));
    const vertical = Number(this._held.has('down')) - Number(this._held.has('up'));
    if (horizontal) this._facing = horizontal < 0 ? -1 : 1;
    this._x = Math.min(142, this._x + horizontal * 0.85 + 0.07);
    this._y = Math.max(68, Math.min(159, this._y + vertical * 0.72));
    this._knifeCooldown = Math.max(0, this._knifeCooldown - 1);
    this._knifeFrames = Math.max(0, this._knifeFrames - 1);
    if (this._held.has('fire') && this._knifeCooldown === 0) {
      this._knifeFrames = 12;
      this._knifeCooldown = 24;
      this.sound('knife');
    }
    this._pose = this._knifeFrames > 0 ? 'knife' : 'swim';
    if (this._y <= 72) this._airFrames = Math.min(1200, this._airFrames + 18);
    else if (!this._godMode) {
      this._airFrames--;
      if (this._airFrames === 240) this.sound('air');
      if (this._airFrames <= 0) {
        this.loseLife();
        return;
      }
    }
    for (const crocodile of this.crocodiles()) {
      if (!crocodile.alive) continue;
      const knifeX = this._x + this._facing * 4;
      const knifeHits =
        this._knifeFrames > 0 &&
        this._y >= crocodile.y + 5 &&
        this._y <= crocodile.y + 21 &&
        Math.abs(knifeX - crocodile.x) < 14;
      if (knifeHits && crocodile.mouth !== 2) {
        this._killedCrocodiles.add(crocodile.id);
        this.addScore(crocodile.rogue ? 300 : crocodile.mouth === 1 ? 200 : 100);
        this.sound('crocodile');
      } else if (
        Math.abs(this._x - crocodile.x) < 14 &&
        Math.abs(this._y + 5 - crocodile.y) < (crocodile.mouth === 2 ? 13 : 9)
      )
        this.loseLife();
      if (this._status !== 'playing') return;
    }
    if (this._x < RIVER_END) this.finishSection();
  }

  private boulders(): IJungleHuntSnapshot['boulders'] {
    return Array.from({ length: 17 }, (_, id) => {
      const large = id % 3 !== 0;
      const radius = large ? 9 : 4;
      const phase = this._stageFrame * (0.04 + this.difficulty * 0.003) + id * 1.74;
      const height = large ? 44 + (id % 2) * 11 : 3;
      return {
        id,
        x: 12 - id * 85 + this._stageFrame * (0.16 + this.difficulty * 0.035),
        y: FLOOR - radius - Math.abs(Math.sin(phase)) * height,
        radius,
        passed: this._passedBoulders.has(id),
      };
    });
  }

  private stepGround(): void {
    const duck = this._stage === 'boulders' && this._held.has('down') && this._y >= FLOOR - 18;
    const direction = Number(this._held.has('right')) - Number(this._held.has('left'));
    if (direction) this._facing = direction < 0 ? -1 : 1;
    if (!duck) this._x += direction * 0.95;
    this._x = Math.min(this._stage === 'rescue' ? 148 : 142, this._x);
    const grounded = this._y >= FLOOR - 18;
    if (this._firePressed && grounded && !duck) {
      this._velocityY = -2.65;
      this._jumpFrames = 0;
      this.sound('jump');
    }
    if (!grounded || this._velocityY < 0) {
      this._jumpFrames++;
      this._y += this._velocityY;
      this._velocityY +=
        this._held.has('up') && this._velocityY < 0 && this._jumpFrames < 25 ? 0.05 : 0.11;
      this._y = Math.min(FLOOR - 18, this._y);
      this._pose = 'jump';
    } else {
      this._velocityY = 0;
      this._pose = duck ? 'duck' : 'run';
    }
  }

  private stepBoulders(): void {
    const top = this._pose === 'duck' ? FLOOR - 7 : this._y;
    for (const boulder of this.boulders()) {
      if (boulder.passed) continue;
      const dx = boulder.x - this._x;
      if (Math.abs(dx) < 12) {
        const points =
          this._y + 14 < boulder.y - boulder.radius ? 200 : this._pose === 'duck' ? 100 : 50;
        this._boulderStrategies.set(
          boulder.id,
          Math.max(points, this._boulderStrategies.get(boulder.id) ?? 0),
        );
      }
      const nearX = Math.max(this._x - 3, Math.min(this._x + 3, boulder.x));
      const nearY = Math.max(top, Math.min(this._y + 18, boulder.y));
      if ((nearX - boulder.x) ** 2 + (nearY - boulder.y) ** 2 < boulder.radius ** 2)
        this.loseLife();
      if (this._status !== 'playing') return;
      if (dx > boulder.radius + 7) {
        this._passedBoulders.add(boulder.id);
        this.addScore(this._boulderStrategies.get(boulder.id) ?? 50);
        this.sound('boulder');
      }
    }
    if (this._x < BOULDER_END) this.finishSection();
  }

  private guards(): IJungleHuntSnapshot['guards'] {
    return [0, 1].map((id) => ({
      id,
      x:
        91 -
        id * 43 +
        Math.sin(this._stageFrame * (0.022 + this.difficulty * 0.003) + id * 2) *
          (8 + this.difficulty),
      y: FLOOR - 19,
      spearY: FLOOR - 27 - (Math.floor((this._stageFrame + id * 35) / 32) % 2) * 5,
      passed: this._passedGuards.has(id),
    }));
  }

  private stepRescue(): void {
    for (const guard of this.guards()) {
      if (Math.abs(this._x - guard.x) < 8 && this._y + 16 > guard.spearY) this.loseLife();
      if (this._status !== 'playing') return;
      if (!guard.passed && this._x < guard.x - 11) {
        this._passedGuards.add(guard.id);
        this.addScore(200);
        this.sound('guard');
      }
    }
    if (this._x < 19 && this._passedGuards.size === 2 && this._y >= FLOOR - 20) {
      this._rescues++;
      this.addScore(500 + 3 * Math.ceil(this._timerFrames / 6));
      this._status = 'rescued';
      this._pose = 'celebrate';
      this._delay = 150;
      this.releaseInputs();
      this.sound('rescue');
    }
  }

  private enterStage(stage: IJungleHuntSnapshot['stage']): void {
    this._stage = stage;
    this._stageFrame = 0;
    this._x = 132;
    this._y = stage === 'vines' ? 108 : stage === 'river' ? 70 : FLOOR - 18;
    this._velocityX = 0;
    this._velocityY = 0;
    this._facing = -1;
    this._vine = stage === 'vines' ? 0 : null;
    this._lastVine = 0;
    this._knifeFrames = 0;
    this._knifeCooldown = 0;
    this._airFrames = 1200;
    this._collectedVines.clear();
    this._killedCrocodiles.clear();
    this._passedBoulders.clear();
    this._boulderStrategies.clear();
    this._passedGuards.clear();
    this._pose = stage === 'vines' ? 'swing' : stage === 'river' ? 'swim' : 'run';
    this._delay = 0;
    this._firePressed = false;
  }

  private finishSection(): void {
    this.addScore(500);
    this._status = 'transition';
    this._delay = 60;
    this._firePressed = false;
    this.sound('section');
  }

  private loseLife(): void {
    if (this._godMode || this._status !== 'playing') return;
    this._lives--;
    this._status = 'dying';
    this._pose = 'dead';
    this._delay = 90;
    this.releaseInputs();
    this.sound('death');
  }

  private addScore(points: number): void {
    this._score = (this._score + points) % 1000000;
    if (!this._extraLifeAwarded && this._score >= 10000) {
      this._extraLifeAwarded = true;
      this._lives++;
      this.sound('extraLife');
    }
  }

  private sound(kind: IJungleHuntSoundEvent['kind']): void {
    this._sounds = [...this._sounds.slice(-15), { id: ++this._soundId, kind }];
  }

  // #endregion
}
