// #region Imports

import { BoxingContenders } from './BoxingContenders';
import type { BoxingControl } from './BoxingControl';
import type { IBoxingFighter } from './IBoxingFighter';
import type { IBoxingOptions } from './IBoxingOptions';
import type { IBoxingResult } from './IBoxingResult';
import type { IBoxingSnapshot } from './IBoxingSnapshot';
import type { IBoxingSoundEvent } from './IBoxingSoundEvent';

// #endregion

const DEFAULT_OPTIONS: IBoxingOptions = {
  players: 1,
  difficulty: 'B',
  contenders: ['iron-fists', 'macho-man'],
};
const ROUND_FRAMES = 2700;
const RING = { left: 32, right: 288, top: 76, bottom: 142 };
const ATTACKS = {
  jab: { recovery: 12, cost: 1.2, damage: 3.8, points: 1, reach: 34 },
  body: { recovery: 24, cost: 2.8, damage: 7.5, points: 2, reach: 31 },
  payoff: { recovery: 36, cost: 5, damage: 12, points: 3, reach: 36 },
} as const;

type Attack = keyof typeof ATTACKS;
type ActiveStatus = Exclude<IBoxingSnapshot['status'], 'paused'>;

interface IFighterState {
  x: number;
  y: number;
  strength: number;
  score: number;
  roundScore: number;
  unanswered: number;
  knockdowns: number;
  pose: IBoxingFighter['pose'];
  animation: number;
  recovery: number;
  hurt: number;
  attack: Attack | null;
  attackFrames: number;
  armed: boolean;
  covering: boolean;
}

/**
 * Complete RealSports Boxing match rules reconstructed from Atari's original manual.
 * Numerical timing, movement and damage values are explicitly documented adaptations;
 * the game is not represented as a ROM emulator or a cycle-exact disassembly port.
 * @public
 */
export class RealsportsBoxingGame {
  // #region Fields

  private _options: IBoxingOptions = DEFAULT_OPTIONS;
  private _fighters: [IFighterState, IFighterState] = [this.makeFighter(0), this.makeFighter(1)];
  private _inputs: [Set<BoxingControl>, Set<BoxingControl>] = [new Set(), new Set()];
  private _status: ActiveStatus = 'demo';
  private _paused = false;
  private _demo = true;
  private _frame = 0;
  private _round = 1;
  private _roundFrames = ROUND_FRAMES;
  private _phaseFrames = 0;
  private _accumulator = 0;
  private _downed: 0 | 1 | null = null;
  private _count = 0;
  private _result: IBoxingResult | null = null;
  private _events: IBoxingSoundEvent[] = [];
  private _eventId = 0;
  private _random = 137;
  private _godMode = false;

  // #endregion

  // #region Properties

  /** The current ring, round, contenders and retained final result. @public @readonly */
  public get snapshot(): IBoxingSnapshot {
    return {
      status: this._paused ? 'paused' : this._status,
      options: this._options,
      fighters: [this.projectFighter(0), this.projectFighter(1)],
      frame: this._frame,
      round: this._round,
      secondsRemaining: Math.ceil(this._roundFrames / 15),
      intermissionSeconds: Math.ceil(this._phaseFrames / 60),
      count: this._count,
      downedPlayer: this._downed,
      result: this._result,
      soundEvents: this._events,
    };
  }

  // #endregion

  // #region Methods

  /**
   * Selects distinct original contenders and begins a fresh match at the opening bell.
   * @param options - Player count, console difficulty and the selected contenders.
   * @public
   */
  public startMatch(options: IBoxingOptions = this._options): void {
    if (![1, 2].includes(options.players) || !['A', 'B'].includes(options.difficulty))
      throw new Error('Choose a supported player count and difficulty.');
    if (
      options.contenders[0] === options.contenders[1] ||
      options.contenders.some((id) => !BoxingContenders.some((boxer) => boxer.id === id))
    )
      throw new Error('Choose two different contenders.');
    this._options = { ...options, contenders: [...options.contenders] };
    this.resetFight(false);
    this._result = null;
    this._status = 'ready';
    this._phaseFrames = 60;
  }

  /** Runs an autonomous demonstration fight, preserving an optional prior result. @public */
  public startDemo(): void {
    this.resetFight(true);
  }

  /**
   * Samples a controller. Fire plus toward/away/up/down selects jab/cover/payoff/body.
   * @param player - Zero for the left controller, one for the right controller.
   * @param control - Joystick direction or fire.
   * @param active - Whether it is held.
   * @public
   */
  public setInput(player: 0 | 1, control: BoxingControl, active: boolean): void {
    if (!active) this._inputs[player].delete(control);
    else if (!this._paused && !this._demo && this._result === null)
      this._inputs[player].add(control);
  }

  /** Clears both players' held controls and pending punches. @public */
  public releaseInputs(): void {
    this._inputs[0].clear();
    this._inputs[1].clear();
    for (const fighter of this._fighters) {
      fighter.armed = true;
      fighter.covering = false;
    }
  }

  /** Freezes the exact current phase, including a knockdown count or round rest. @public */
  public pause(): void {
    this._paused = true;
    this.releaseInputs();
  }

  /** Pauses or resumes without advancing a hidden interval. @public */
  public togglePause(): void {
    if (this._paused) this._paused = false;
    else this.pause();
  }

  /**
   * Advances a bounded, deterministic 60 Hz simulation; a round's 3:00 clock runs at 4×.
   * @param milliseconds - Host frame duration.
   * @public
   */
  public step(milliseconds: number): void {
    if (this._paused || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
    this._events = [];
    this._accumulator += Math.min(milliseconds, 250);
    while (this._accumulator + 0.000001 >= 1000 / 60) {
      this._accumulator -= 1000 / 60;
      this.tick();
    }
  }

  /**
   * Establishes deterministic collision and recovery scenarios without changing match rules.
   * @param player - Boxer to place.
   * @param state - Ring position and optional endurance/score values.
   * @public
   */
  public placeFighter(
    player: 0 | 1,
    state: { x: number; y: number; strength?: number; score?: number },
  ): void {
    const fighter = this._fighters[player];
    fighter.x = Math.max(RING.left, Math.min(RING.right, state.x));
    fighter.y = Math.max(RING.top, Math.min(RING.bottom, state.y));
    if (state.strength !== undefined) fighter.strength = Math.max(0, Math.min(100, state.strength));
    if (state.score !== undefined)
      fighter.score = Math.max(0, Math.min(99, Math.round(state.score)));
  }

  /** Enables the session-only reflected-damage test adaptation for Player 1. @public */
  public setGodMode(enabled: boolean): void {
    this._godMode = enabled;
  }

  private tick(): void {
    this._frame += 1;
    if (this._status === 'ready') {
      if (this._phaseFrames === 60) this.emit('bell');
      this._phaseFrames -= 1;
      if (this._phaseFrames === 0) this._status = 'fighting';
      return;
    }
    if (this._status === 'celebration') {
      this._phaseFrames -= 1;
      if (this._phaseFrames === 0) this.resetFight(true);
      return;
    }
    if (this._status === 'rest') {
      this.rest();
      return;
    }
    if (this._status === 'knockdown') {
      this.countDown();
      return;
    }
    this._roundFrames -= 1;
    const controls: [Set<BoxingControl>, Set<BoxingControl>] = [
      this._demo ? this.computerInput(0) : this._inputs[0],
      this._demo || this._options.players === 1 ? this.computerInput(1) : this._inputs[1],
    ];
    const launches: [Attack | null, Attack | null] = [
      this.controlFighter(0, controls[0]),
      this.controlFighter(1, controls[1]),
    ];
    const hits = launches.map(
      (attack, index) => attack !== null && this.inReach(index as 0 | 1, ATTACKS[attack].reach),
    );
    for (const player of [0, 1] as const) {
      if (launches[player] && hits[player]) {
        this.hit(player, launches[player], Boolean(hits[1 - player]));
        if (this._downed !== null || this._phaseFrames > 0) return;
      }
    }
    if (!this.inReach(0, 42)) {
      this._fighters[0].unanswered = 0;
      this._fighters[1].unanswered = 0;
    }
    if (this._roundFrames <= 0) this.endRound();
  }

  private controlFighter(player: 0 | 1, controls: Set<BoxingControl>): Attack | null {
    const fighter = this._fighters[player];
    const opponent = this._fighters[player === 0 ? 1 : 0];
    const facing = opponent.x >= fighter.x ? 1 : -1;
    fighter.recovery = Math.max(0, fighter.recovery - 1);
    fighter.hurt = Math.max(0, fighter.hurt - 1);
    fighter.attackFrames = Math.max(0, fighter.attackFrames - 1);
    const horizontal = Number(controls.has('right')) - Number(controls.has('left'));
    const vertical = Number(controls.has('down')) - Number(controls.has('up'));
    const fire = controls.has('fire');
    const cover = fire && horizontal === -facing && vertical === 0;
    if (cover && !fighter.covering) fighter.unanswered = 0;
    fighter.covering = cover;
    if (!fire) fighter.armed = true;
    fighter.pose =
      fighter.hurt > 0
        ? 'hurt'
        : cover
          ? 'cover'
          : fighter.attackFrames > 0 && fighter.attack
            ? fighter.attack
            : 'idle';
    fighter.animation = Math.floor(this._frame / 6) & 1;
    if (fighter.hurt > 0) return null;
    if (!fire && fighter.attackFrames === 0) {
      const speed =
        (0.4 + fighter.strength / 150) *
        (this._options.players === 1 && player === 1 && this._options.difficulty === 'B' ? 0.8 : 1);
      const oldX = fighter.x;
      const oldY = fighter.y;
      fighter.x = Math.max(RING.left, Math.min(RING.right, fighter.x + horizontal * speed));
      fighter.y = Math.max(RING.top, Math.min(RING.bottom, fighter.y + vertical * speed * 0.6));
      // Feet may pass above/below the other boxer, but cannot occupy the same stance.
      if (Math.abs(fighter.y - opponent.y) < 8 && Math.abs(fighter.x - opponent.x) < 18)
        fighter.x = oldX;
      if (fighter.x !== oldX || fighter.y !== oldY) {
        fighter.strength = Math.max(0, fighter.strength - 0.014);
        fighter.pose = 'move';
      }
    }
    if (!fire || cover || !fighter.armed || fighter.recovery > 0) return null;
    const attack: Attack | null =
      vertical < 0 ? 'payoff' : vertical > 0 ? 'body' : horizontal === facing ? 'jab' : null;
    if (!attack) return null;
    const stats = ATTACKS[attack];
    fighter.armed = false;
    fighter.strength = Math.max(0, fighter.strength - stats.cost);
    fighter.attack = attack;
    fighter.attackFrames = Math.round(stats.recovery / 2);
    fighter.recovery = Math.round(stats.recovery * (1 + (100 - fighter.strength) / 110));
    fighter.pose = attack;
    this.emit(attack);
    return attack;
  }

  private hit(player: 0 | 1, attack: Attack, countered: boolean): void {
    const defenderIndex = player === 0 ? 1 : 0;
    const attacker = this._fighters[player];
    const defender = this._fighters[defenderIndex];
    // Honor the finishing opportunity displayed before the player paid for this punch.
    const strengthLead = attacker.strength + ATTACKS[attack].cost - defender.strength;
    const depth = attacker.y - defender.y;
    const optimum = Math.abs(depth) <= 7;
    const defended = defender.covering;
    const stats = ATTACKS[attack];
    const damage =
      stats.damage *
      (0.4 + attacker.strength / 160) *
      (optimum ? 1 : 0.65) *
      (defended ? 0.2 : countered ? 0.45 : 1);
    const score = Math.max(
      1,
      Math.round(stats.points * (0.5 + attacker.strength / 150) * (optimum ? 1.3 : 1)),
    );
    if (this._godMode && !this._demo && defenderIndex === 0) {
      this.reflectHit(attacker, defender, damage, score, countered, defended);
      return;
    }
    defender.strength = Math.max(0, defender.strength - damage);
    attacker.score = Math.min(99, attacker.score + score);
    attacker.roundScore += score;
    attacker.unanswered = 0;
    defender.unanswered = countered ? 0 : defender.unanswered + 1;
    if (defended) {
      defender.score = Math.min(99, defender.score + 1);
      defender.roundScore += 1;
      this.emit('block');
    } else if (!countered) {
      defender.hurt = 4;
      defender.pose = 'hurt';
      defender.x = Math.max(
        RING.left,
        Math.min(RING.right, defender.x + (attacker.x < defender.x ? 1 : -1) * 1.2),
      );
    }
    if (defender.unanswered >= 12) {
      this.finish(player, 'technical-knockout');
      return;
    }
    const target = BoxingContenders.find(
      (contender) => contender.id === this._options.contenders[defenderIndex],
    );
    const correctPosition =
      target?.weakPosition === 'level'
        ? Math.abs(depth) <= 3
        : target?.weakPosition === 'above'
          ? depth <= -4
          : depth >= 4;
    if (
      !defended &&
      !countered &&
      strengthLead >= 25 &&
      attack === target?.weakPunch &&
      correctPosition
    ) {
      defender.knockdowns += 1;
      defender.pose = 'down';
      defender.attackFrames = 0;
      defender.unanswered = 0;
      this._downed = defenderIndex;
      this._count = 0;
      this._phaseFrames = 0;
      this._status = 'knockdown';
      attacker.x = player === 0 ? RING.left : RING.right;
      attacker.y = RING.bottom;
      this.releaseInputs();
      this.emit('knockdown');
    }
  }

  private reflectHit(
    attacker: IFighterState,
    protectedFighter: IFighterState,
    damage: number,
    score: number,
    countered: boolean,
    defended: boolean,
  ): void {
    attacker.strength = Math.max(0, attacker.strength - damage);
    protectedFighter.score = Math.min(99, protectedFighter.score + score);
    protectedFighter.roundScore += score;
    protectedFighter.unanswered = 0;
    attacker.unanswered = countered ? 0 : attacker.unanswered + 1;
    if (defended) {
      protectedFighter.score = Math.min(99, protectedFighter.score + 1);
      protectedFighter.roundScore += 1;
      this.emit('block');
    } else if (!countered) {
      attacker.hurt = 4;
      attacker.pose = 'hurt';
    }
    if (attacker.unanswered >= 12) this.finish(0, 'technical-knockout');
  }

  private countDown(): void {
    this._phaseFrames += 1;
    if (this._phaseFrames % 45 === 0) {
      this._count += 1;
      this.emit('count');
    }
    if (this._downed === null) return;
    const fighter = this._fighters[this._downed];
    const canRise =
      fighter.strength >= 18 &&
      (this._demo || this._options.players === 1 || this._inputs[this._downed].has('up'));
    if (this._count === 9 && canRise) {
      fighter.strength = Math.min(100, fighter.strength + 7);
      fighter.pose = 'idle';
      fighter.recovery = 30;
      fighter.hurt = 0;
      this._downed = null;
      this._count = 0;
      this._phaseFrames = 0;
      this._status = this._demo ? 'demo' : 'fighting';
      this.releaseInputs();
      this.emit('bell');
    } else if (this._count === 10) this.finish(this._downed === 0 ? 1 : 0, 'knockout');
  }

  private endRound(): void {
    if (this._round === 7) {
      const [left, right] = this._fighters;
      this.finish(
        left.score === right.score ? null : left.score > right.score ? 0 : 1,
        left.score === right.score ? 'draw' : 'decision',
      );
      return;
    }
    this._status = 'rest';
    this._phaseFrames = 240;
    this._fighters[0].x = RING.left;
    this._fighters[1].x = RING.right;
    for (const fighter of this._fighters) {
      fighter.y = RING.bottom;
      fighter.pose = 'idle';
    }
    this.releaseInputs();
    this.emit('bell');
  }

  private rest(): void {
    this._phaseFrames -= 1;
    for (const fighter of this._fighters) fighter.strength = Math.min(100, fighter.strength + 0.07);
    if (this._phaseFrames > 0) return;
    this._round += 1;
    this._roundFrames = ROUND_FRAMES;
    this._status = this._demo ? 'demo' : 'fighting';
    for (const fighter of this._fighters) {
      fighter.roundScore = 0;
      fighter.unanswered = 0;
      fighter.attackFrames = 0;
      fighter.recovery = 0;
    }
    this.releaseInputs();
    this.emit('bell');
  }

  private finish(winner: 0 | 1 | null, reason: IBoxingResult['reason']): void {
    if (!this._demo)
      this._result = {
        winner,
        reason,
        scores: [this._fighters[0].score, this._fighters[1].score],
        round: this._round,
      };
    this._status = 'celebration';
    this._phaseFrames = 240;
    this._downed = null;
    this.releaseInputs();
    for (const player of [0, 1] as const)
      this._fighters[player].pose = winner === null || winner === player ? 'celebrate' : 'down';
    this.emit('victory');
  }

  private computerInput(player: 0 | 1): Set<BoxingControl> {
    const result = new Set<BoxingControl>();
    const fighter = this._fighters[player];
    const opponent = this._fighters[player === 0 ? 1 : 0];
    const strong = this._options.difficulty === 'A' || this._demo;
    const facing = fighter.x < opponent.x ? 1 : -1;
    const target = BoxingContenders.find(
      (contender) => contender.id === this._options.contenders[player === 0 ? 1 : 0],
    );
    const preferredY =
      fighter.strength - opponent.strength >= 25
        ? opponent.y +
          (target?.weakPosition === 'above' ? -6 : target?.weakPosition === 'below' ? 6 : 0)
        : opponent.y - 2;
    if (Math.abs(fighter.y - preferredY) > 2) result.add(fighter.y > preferredY ? 'up' : 'down');
    if (Math.abs(fighter.x - opponent.x) > 27) result.add(facing === 1 ? 'right' : 'left');
    if (
      strong &&
      opponent.attackFrames > 0 &&
      fighter.hurt === 0 &&
      (this._frame + player * 3) % 9 < 5
    ) {
      result.clear();
      result.add('fire');
      result.add(facing === 1 ? 'left' : 'right');
      return result;
    }
    if (
      fighter.recovery === 0 &&
      this.inReach(player, 31) &&
      this._frame % (strong ? 3 : 9) === 0
    ) {
      this._random = (this._random * 1664525 + 1013904223) >>> 0;
      const attack =
        fighter.strength - opponent.strength >= 25
          ? (target?.weakPunch ?? 'payoff')
          : ['jab', 'body', 'payoff'][this._random % 3];
      result.clear();
      result.add('fire');
      result.add(
        attack === 'payoff' ? 'up' : attack === 'body' ? 'down' : facing === 1 ? 'right' : 'left',
      );
    }
    return result;
  }

  private inReach(player: 0 | 1, reach: number): boolean {
    const attacker = this._fighters[player];
    const defender = this._fighters[player === 0 ? 1 : 0];
    return Math.abs(attacker.x - defender.x) <= reach && Math.abs(attacker.y - defender.y) <= 12;
  }

  private projectFighter(player: 0 | 1): IBoxingFighter {
    const fighter = this._fighters[player];
    const opponent = this._fighters[player === 0 ? 1 : 0];
    return {
      contender: this._options.contenders[player],
      x: fighter.x,
      y: fighter.y,
      facing: fighter.x <= opponent.x ? 1 : -1,
      strength: fighter.strength,
      strengthLead: Math.max(0, fighter.strength - opponent.strength),
      canKnockDown: fighter.strength - opponent.strength >= 25,
      score: fighter.score,
      roundScore: Math.min(99, fighter.roundScore),
      unanswered: fighter.unanswered,
      knockdowns: fighter.knockdowns,
      pose: fighter.pose,
      animation: fighter.animation,
    };
  }

  private makeFighter(player: 0 | 1): IFighterState {
    return {
      x: player === 0 ? RING.left : RING.right,
      y: RING.bottom,
      strength: 100,
      score: 0,
      roundScore: 0,
      unanswered: 0,
      knockdowns: 0,
      pose: 'idle',
      animation: 0,
      recovery: 0,
      hurt: 0,
      attack: null,
      attackFrames: 0,
      armed: true,
      covering: false,
    };
  }

  private resetFight(demo: boolean): void {
    this._demo = demo;
    this._fighters = [this.makeFighter(0), this.makeFighter(1)];
    this._frame = 0;
    this._round = 1;
    this._roundFrames = ROUND_FRAMES;
    this._phaseFrames = 0;
    this._downed = null;
    this._count = 0;
    this._paused = false;
    this._status = demo ? 'demo' : 'fighting';
    this._accumulator = 0;
    this._events = [];
    this._random = 137;
    this.releaseInputs();
  }

  private emit(kind: IBoxingSoundEvent['kind']): void {
    this._eventId += 1;
    this._events.push({ id: this._eventId, kind });
  }

  // #endregion
}
