// #region Imports

import { describe, expect, it } from 'vitest';
import { RealsportsBoxingGame } from './RealsportsBoxingGame';
import type { IBoxingOptions } from './IBoxingOptions';
import type { BoxingControl } from './BoxingControl';

// #endregion

const OPTIONS: IBoxingOptions = {
  players: 2,
  difficulty: 'B',
  contenders: ['iron-fists', 'macho-man'],
};

function frames(game: RealsportsBoxingGame, count: number): void {
  for (let frame = 0; frame < count; frame += 1) game.step(1000 / 60);
}

function match(options: IBoxingOptions = OPTIONS): RealsportsBoxingGame {
  const game = new RealsportsBoxingGame();
  game.startMatch(options);
  frames(game, 60);
  return game;
}

function punch(game: RealsportsBoxingGame, player: 0 | 1, direction: BoxingControl): void {
  game.setInput(player, 'fire', true);
  game.setInput(player, direction, true);
  frames(game, 1);
  game.setInput(player, 'fire', false);
  game.setInput(player, direction, false);
}

describe('RealsportsBoxingGame', () => {
  it('runs an attract fight until the selected match begins at a fresh bell', () => {
    // arrange
    const game = new RealsportsBoxingGame();
    const initial = game.snapshot;

    // act
    frames(game, 180);
    const demo = game.snapshot;
    game.startMatch(OPTIONS);
    frames(game, 1);

    // assert
    expect(initial.status).toBe('demo');
    expect(demo.fighters[0].x).toBeGreaterThan(initial.fighters[0].x);
    expect(game.snapshot).toMatchObject({
      status: 'ready',
      round: 1,
      secondsRemaining: 180,
      result: null,
    });
    expect(game.snapshot.soundEvents.map((event) => event.kind)).toContain('bell');
    frames(game, 59);
    expect(game.snapshot.status).toBe('fighting');
  });

  it('rejects duplicate contender selection instead of silently producing an impossible matchup', () => {
    // arrange
    const game = new RealsportsBoxingGame();

    // act
    // assert
    expect(() =>
      game.startMatch({ ...OPTIONS, contenders: ['iron-fists', 'iron-fists'] }),
    ).toThrow();
    expect(game.snapshot.status).toBe('demo');
  });

  it('moves both players in ring depth, respects the ropes and prevents a shared stance', () => {
    // arrange
    const game = match();
    game.setInput(0, 'right', true);
    game.setInput(0, 'up', true);
    game.setInput(1, 'left', true);

    // act
    frames(game, 360);

    // assert
    expect(game.snapshot.fighters[0].y).toBe(76);
    expect(game.snapshot.fighters[0].x).toBeLessThanOrEqual(288);
    expect(game.snapshot.fighters[1].x).toBe(32);
    expect(game.snapshot.fighters.every((fighter) => fighter.strength < 100)).toBe(true);
  });

  it('samples fire plus toward, down and up as distinct punch types and requires a released fire button', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110 });
    game.placeFighter(1, { x: 153, y: 110 });
    game.setInput(0, 'right', true);
    game.setInput(0, 'fire', true);

    // act
    frames(game, 1);
    const jab = game.snapshot;
    frames(game, 90);
    const held = game.snapshot;
    game.releaseInputs();
    punch(game, 0, 'down');
    const body = game.snapshot;
    frames(game, 90);
    punch(game, 0, 'up');

    // assert
    expect(jab.fighters[0].pose).toBe('jab');
    expect(held.fighters[0].score).toBe(jab.fighters[0].score);
    expect(body.fighters[0].pose).toBe('body');
    expect(game.snapshot.fighters[0].pose).toBe('payoff');
    expect(body.fighters[0].score - held.fighters[0].score).toBeGreaterThanOrEqual(
      jab.fighters[0].score,
    );
  });

  it('uses toward and away relative to the opponent after changing sides', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 170, y: 110 });
    game.placeFighter(1, { x: 145, y: 110 });

    // act
    punch(game, 0, 'left');
    const attack = game.snapshot;
    frames(game, 50);
    game.setInput(0, 'fire', true);
    game.setInput(0, 'right', true);
    frames(game, 1);

    // assert
    expect(attack.fighters[0].score).toBeGreaterThan(0);
    expect(game.snapshot.fighters[0].pose).toBe('cover');
  });

  it('does not land a visually out-of-range or incorrectly aligned punch', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 140, y: 76 });
    game.placeFighter(1, { x: 160, y: 120 });

    // act
    punch(game, 0, 'up');

    // assert
    expect(game.snapshot.fighters[0].score).toBe(0);
    expect(game.snapshot.fighters[0].strength).toBeLessThan(100);
    expect(game.snapshot.fighters[1].strength).toBe(100);
  });

  it('awards defensive points, reduces damage and resets a flurry when cover begins', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110 });
    game.placeFighter(1, { x: 154, y: 110 });
    punch(game, 0, 'right');
    frames(game, 40);
    game.setInput(1, 'fire', true);
    game.setInput(1, 'right', true);
    frames(game, 1);
    const before = game.snapshot;

    // act
    punch(game, 0, 'right');

    // assert
    expect(before.fighters[1].unanswered).toBe(0);
    expect(game.snapshot.fighters[1].score).toBe(1);
    expect(before.fighters[1].strength - game.snapshot.fighters[1].strength).toBeLessThan(1);
    expect(game.snapshot.fighters[1].unanswered).toBe(1);
  });

  it('calls a TKO after twelve unanswered jabs using only ordinary controls against the ropes', () => {
    // arrange
    const game = match();
    game.setInput(0, 'right', true);
    frames(game, 270);

    // act
    for (let count = 0; count < 12; count += 1) {
      game.setInput(0, 'fire', true);
      frames(game, 1);
      game.setInput(0, 'fire', false);
      frames(game, 20);
    }

    // assert
    expect(game.snapshot.result).toMatchObject({
      winner: 0,
      reason: 'technical-knockout',
      round: 1,
    });
    expect(game.snapshot.status).toBe('celebration');
    expect(game.snapshot.fighters[0].pose).toBe('celebrate');
  });

  it('reflects landed opponent damage and TKO progress onto the opponent in God mode', () => {
    // arrange
    const game = match();
    game.setGodMode(true);
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 100 });

    // act
    punch(game, 1, 'left');
    const firstHit = game.snapshot;
    for (let count = 1; count < 12; count += 1) {
      frames(game, 20);
      punch(game, 1, 'left');
    }

    // assert
    expect(firstHit.fighters[0].strength).toBe(100);
    expect(firstHit.fighters[0].score).toBeGreaterThan(0);
    expect(firstHit.fighters[0].unanswered).toBe(0);
    expect(firstHit.fighters[0].pose).not.toBe('hurt');
    expect(firstHit.fighters[1].strength).toBeLessThan(98.8);
    expect(firstHit.fighters[1]).toMatchObject({ pose: 'hurt', unanswered: 1 });
    expect(game.snapshot.result).toMatchObject({
      winner: 0,
      reason: 'technical-knockout',
      round: 1,
    });
  });

  it('can still TKO a continuously covering boxer after another twelve unanswered blows', () => {
    // arrange
    const game = match();
    game.setInput(0, 'right', true);
    frames(game, 270);
    game.setInput(1, 'right', true);
    game.setInput(1, 'fire', true);

    // act
    for (let count = 0; count < 12; count += 1) {
      game.setInput(0, 'fire', true);
      frames(game, 1);
      game.setInput(0, 'fire', false);
      frames(game, 20);
    }

    // assert
    expect(game.snapshot.result?.reason).toBe('technical-knockout');
    expect(game.snapshot.result?.scores[1]).toBe(12);
  });

  it('resets the unanswered-punch count when the defender escapes or counterpunches', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110 });
    game.placeFighter(1, { x: 154, y: 110 });
    punch(game, 0, 'right');
    frames(game, 20);

    // act
    punch(game, 1, 'left');
    const retaliated = game.snapshot;
    frames(game, 30);
    punch(game, 0, 'right');
    game.setInput(1, 'down', true);
    frames(game, 60);

    // assert
    expect(retaliated.fighters[1].unanswered).toBe(0);
    expect(game.snapshot.fighters[1].unanswered).toBe(0);
  });

  it.each([
    ['iron-fists', 'down', 110],
    ['jabbin-jack', 'up', 104],
    ['lefty-oleary', 'down', 116],
    ['macho-man', 'up', 110],
  ] as const)(
    'knocks %s down with his documented weak-spot punch and position',
    (contender, direction, y) => {
      // arrange
      const game = match({
        ...OPTIONS,
        contenders: [contender === 'iron-fists' ? 'macho-man' : 'iron-fists', contender],
      });
      game.placeFighter(0, { x: 130, y, strength: 100 });
      game.placeFighter(1, { x: 154, y: 110, strength: 45 });

      // act
      punch(game, 0, direction);

      // assert
      expect(game.snapshot).toMatchObject({ status: 'knockdown', downedPlayer: 1 });
      expect(game.snapshot.fighters[1].knockdowns).toBe(1);
    },
  );

  it('honors a blinking strength bar when the correct finishing punch spends its own strength', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 75 });
    const opportunity = game.snapshot.fighters[0].canKnockDown;

    // act
    punch(game, 0, 'up');

    // assert
    expect(opportunity).toBe(true);
    expect(game.snapshot.status).toBe('knockdown');
  });

  it('requires the strength lead and correct depth for a knockdown', () => {
    // arrange
    const game = match({ ...OPTIONS, contenders: ['iron-fists', 'jabbin-jack'] });
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 40 });

    // act
    punch(game, 0, 'up');

    // assert
    expect(game.snapshot.fighters[0].canKnockDown).toBe(true);
    expect(game.snapshot.status).toBe('fighting');
    expect(game.snapshot.fighters[1].knockdowns).toBe(0);
  });

  it('lets the second local player rise at nine only when Up is held and strength remains', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 50 });
    punch(game, 0, 'up');
    const time = game.snapshot.secondsRemaining;
    frames(game, 45 * 8);

    // act
    game.setInput(1, 'up', true);
    frames(game, 45);

    // assert
    expect(game.snapshot.status).toBe('fighting');
    expect(game.snapshot.downedPlayer).toBeNull();
    expect(game.snapshot.secondsRemaining).toBe(time);
    expect(game.snapshot.result).toBeNull();
  });

  it('counts out a boxer at ten when strength is insufficient, even with Up held', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 14 });
    punch(game, 0, 'up');
    game.setInput(1, 'up', true);

    // act
    frames(game, 450);

    // assert
    expect(game.snapshot.result).toMatchObject({ winner: 0, reason: 'knockout' });
  });

  it('accepts the local get-up control after the count of nine becomes visible', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 50 });
    punch(game, 0, 'up');
    frames(game, 405);
    const displayedNine = game.snapshot;

    // act
    game.setInput(1, 'up', true);
    frames(game, 1);

    // assert
    expect(displayedNine).toMatchObject({ status: 'knockdown', count: 9 });
    expect(game.snapshot).toMatchObject({
      status: 'fighting',
      count: 0,
      downedPlayer: null,
      result: null,
    });
    expect(game.snapshot.fighters[1].pose).toBe('idle');
  });

  it('resolves both simultaneous counterpunches after recovering from a knockdown', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 50 });
    punch(game, 0, 'up');
    game.setInput(1, 'up', true);
    frames(game, 445);
    game.placeFighter(0, { x: 130, y: 110, strength: 100, score: 0 });
    game.placeFighter(1, { x: 154, y: 110, strength: 100, score: 0 });

    // act
    game.setInput(0, 'right', true);
    game.setInput(0, 'fire', true);
    game.setInput(1, 'left', true);
    game.setInput(1, 'fire', true);
    frames(game, 1);

    // assert
    expect(game.snapshot.status).toBe('fighting');
    expect(game.snapshot.fighters[0].score).toBeGreaterThan(0);
    expect(game.snapshot.fighters[1].score).toBeGreaterThan(0);
    expect(game.snapshot.fighters[0].strength).toBeLessThan(98.8);
    expect(game.snapshot.fighters[1].strength).toBeLessThan(98.8);
  });

  it('counts out a sufficiently strong local player who does not request a get-up at nine', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, strength: 100 });
    game.placeFighter(1, { x: 154, y: 110, strength: 50 });
    punch(game, 0, 'up');

    // act
    frames(game, 450);

    // assert
    expect(game.snapshot.result?.reason).toBe('knockout');
  });

  it('restores some strength in corners between rounds while preserving match scores', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 32, y: 142, strength: 40, score: 7 });

    // act
    frames(game, 2700);
    const resting = game.snapshot;
    frames(game, 240);

    // assert
    expect(resting).toMatchObject({ status: 'rest', round: 1 });
    expect(game.snapshot).toMatchObject({ status: 'fighting', round: 2, secondsRemaining: 180 });
    expect(game.snapshot.fighters[0].strength).toBeGreaterThan(40);
    expect(game.snapshot.fighters[0].strength).toBeLessThan(100);
    expect(game.snapshot.fighters[0].score).toBe(7);
  });

  it.each([
    [20, 15, 0, 'decision'],
    [12, 12, null, 'draw'],
  ] as const)('decides a seven-round fight with scores %i–%i', (one, two, winner, reason) => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 32, y: 142, score: one });
    game.placeFighter(1, { x: 288, y: 142, score: two });

    // act
    frames(game, 7 * 2700 + 6 * 240);

    // assert
    expect(game.snapshot.result).toEqual({ winner, reason, scores: [one, two], round: 7 });
  });

  it('caps match points at 99 without using the unrelated Activision 100-point knockout rule', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110, score: 98 });
    game.placeFighter(1, { x: 154, y: 110 });

    // act
    punch(game, 0, 'up');

    // assert
    expect(game.snapshot.fighters[0].score).toBe(99);
    expect(game.snapshot.result).toBeNull();
  });

  it('preserves a paused knockdown count, clears held keys and bounds suspended host intervals', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110 });
    game.placeFighter(1, { x: 154, y: 110, strength: 40 });
    punch(game, 0, 'up');
    frames(game, 90);
    game.pause();
    const before = game.snapshot;

    // act
    game.step(100000);
    game.setInput(1, 'up', true);

    // assert
    expect(game.snapshot.frame).toBe(before.frame);
    expect(game.snapshot.count).toBe(2);
    game.togglePause();
    game.step(Number.NaN);
    game.step(100000);
    expect(game.snapshot.frame).toBe(before.frame + 15);
  });

  it('returns to demonstration play with the result retained, then resets scores and event IDs safely for a rematch', () => {
    // arrange
    const game = match();
    game.placeFighter(0, { x: 130, y: 110 });
    game.placeFighter(1, { x: 154, y: 110, strength: 10 });
    punch(game, 0, 'up');
    frames(game, 450);
    const result = game.snapshot.result;
    const lastId = game.snapshot.soundEvents.at(-1)?.id ?? 0;

    // act
    frames(game, 240);
    const attract = game.snapshot;
    game.startMatch();
    frames(game, 1);

    // assert
    expect(attract.status).toBe('demo');
    expect(attract.result).toEqual(result);
    expect(game.snapshot.result).toBeNull();
    expect(game.snapshot.fighters.map((fighter) => fighter.score)).toEqual([0, 0]);
    expect(game.snapshot.soundEvents[0]?.id).toBeGreaterThan(lastId);
  });

  it('provides autonomous opponents for both original difficulty switch positions', () => {
    // arrange
    const easy = match({ ...OPTIONS, players: 1, difficulty: 'B' });
    const hard = match({ ...OPTIONS, players: 1, difficulty: 'A' });

    // act
    frames(easy, 240);
    frames(hard, 240);

    // assert
    expect(easy.snapshot.fighters[1].x).toBeLessThan(288);
    expect(hard.snapshot.fighters[1].x).toBeLessThan(easy.snapshot.fighters[1].x);
  });
});
