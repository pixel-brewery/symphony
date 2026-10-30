// #region Imports

import type { IRiverRaidActor } from './IRiverRaidActor';
import { RiverRaidSpritePatterns } from './RiverRaidSpritePatterns';

// #endregion

/** Uses the same original bitmap for visible objects and pixel collisions. @public */
export function riverRaidActorRows(actor: IRiverRaidActor, frame: number): readonly number[] {
  if (actor.destroyed)
    return actor.explosion > 0
      ? RiverRaidSpritePatterns[actor.explosion > 16 ? 'explosion1' : 'explosion2']
      : [];
  switch (actor.kind) {
    case 'ship':
      return RiverRaidSpritePatterns.ship;
    case 'helicopter':
      return RiverRaidSpritePatterns[Math.floor(frame / 2) % 2 ? 'heli0' : 'heli1'];
    case 'jet':
      return RiverRaidSpritePatterns.plane;
    case 'fuel':
      return RiverRaidSpritePatterns.fuel;
    case 'house':
      return RiverRaidSpritePatterns.house;
    case 'bridge':
      return RiverRaidSpritePatterns.bridge;
  }
}
