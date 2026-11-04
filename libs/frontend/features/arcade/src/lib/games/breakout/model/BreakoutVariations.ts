// #region Imports
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** The twelve original Atari-2600 cartridge variations, in Game Select order. @public */
export const BreakoutVariations = [
  {
    id: 1,
    label: 'Breakout',
    steer: false,
    catchBall: false,
    invisible: false,
    timed: false,
    breakthrough: false,
  },
  {
    id: 2,
    get label() {
      return translateLabel('loc.symphony.labels.steerable.breakout.2e38c07');
    },
    steer: true,
    catchBall: false,
    invisible: false,
    timed: false,
    breakthrough: false,
  },
  {
    id: 3,
    get label() {
      return translateLabel('loc.symphony.labels.catch.breakout.5f4dbe4');
    },
    steer: false,
    catchBall: true,
    invisible: false,
    timed: false,
    breakthrough: false,
  },
  {
    id: 4,
    get label() {
      return translateLabel('loc.symphony.labels.invisible.breakout.d89c519');
    },
    steer: false,
    catchBall: false,
    invisible: true,
    timed: false,
    breakthrough: false,
  },
  {
    id: 5,
    get label() {
      return translateLabel('loc.symphony.labels.timed.breakout.f82f222');
    },
    steer: false,
    catchBall: false,
    invisible: false,
    timed: true,
    breakthrough: false,
  },
  {
    id: 6,
    get label() {
      return translateLabel('loc.symphony.labels.timed.steerable.breakout.b39af7b');
    },
    steer: true,
    catchBall: false,
    invisible: false,
    timed: true,
    breakthrough: false,
  },
  {
    id: 7,
    get label() {
      return translateLabel('loc.symphony.labels.timed.catch.breakout.a0c484c');
    },
    steer: false,
    catchBall: true,
    invisible: false,
    timed: true,
    breakthrough: false,
  },
  {
    id: 8,
    get label() {
      return translateLabel('loc.symphony.labels.timed.invisible.breakout.192bdfa');
    },
    steer: false,
    catchBall: false,
    invisible: true,
    timed: true,
    breakthrough: false,
  },
  {
    id: 9,
    get label() {
      return translateLabel('loc.symphony.labels.breakthru.aef9502');
    },
    steer: false,
    catchBall: false,
    invisible: false,
    timed: false,
    breakthrough: true,
  },
  {
    id: 10,
    get label() {
      return translateLabel('loc.symphony.labels.steerable.breakthru.ae317fd');
    },
    steer: true,
    catchBall: false,
    invisible: false,
    timed: false,
    breakthrough: true,
  },
  {
    id: 11,
    get label() {
      return translateLabel('loc.symphony.labels.catch.breakthru.422dd94');
    },
    steer: false,
    catchBall: true,
    invisible: false,
    timed: false,
    breakthrough: true,
  },
  {
    id: 12,
    get label() {
      return translateLabel('loc.symphony.labels.invisible.breakthru.3f2d45f');
    },
    steer: false,
    catchBall: false,
    invisible: true,
    timed: false,
    breakthrough: true,
  },
] as const;
