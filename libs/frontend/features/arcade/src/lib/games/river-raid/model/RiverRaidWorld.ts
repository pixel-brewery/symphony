// #region Imports

import type { IRiverRaidBlock } from './IRiverRaidBlock';
import { RiverRaidTerrainPatterns } from './RiverRaidTerrainPatterns';

// #endregion

const ENEMIES = [
  'ship',
  'helicopter',
  'ship',
  'helicopter',
  'jet',
  'ship',
  'helicopter',
  'helicopter',
] as const;
const HOUSE_X = [143, 141, 7, 10, 132, 13, 128, 18, 124, 22, 120, 26, 116, 30, 112];

/** Original seeded shift register, bank transitions, islands and object distribution. @public */
export class RiverRaidWorld {
  // #region Fields

  private readonly _blocks: IRiverRaidBlock[] = [];
  private _seed = 0xa814;
  private _pattern = 12;
  private _state = 0;
  private _remaining = 17;
  private _part = 1;
  private _section = 1;

  // #endregion

  // #region Methods

  /** Generates only the required prefix; restarts always reproduce the same river. @public */
  public block(index: number): IRiverRaidBlock {
    if (index < 0)
      return {
        id: -1,
        section: 1,
        level: 1,
        seed: 0xa814,
        pattern: 12,
        island: false,
        road: true,
        rows: Array.from({ length: 32 }, () => 65535),
        object: { kind: 'house', x: 0, direction: 1, scale: 2 },
      };
    const safeIndex = Math.floor(index);
    while (this._blocks.length <= safeIndex) this._blocks.push(this.generate());
    return this._blocks[safeIndex]!;
  }

  /** Tests original reflected 4-pixel playfield bits at a river coordinate. @public */
  public isLand(x: number, worldY: number): boolean {
    if (x < 0 || x >= 160) return true;
    const block = this.block(Math.floor(worldY / 32));
    const column = Math.floor(x < 80 ? x / 4 : (159 - x) / 4);
    return ((block.rows[((Math.floor(worldY) % 32) + 32) % 32] ?? 0) & (1 << column)) !== 0;
  }

  private generate(): IRiverRaidBlock {
    const previous = this._pattern;
    let road = false;
    this._part--;
    if (this._part === 0) {
      if (--this._remaining === 0) {
        this._section++;
        this._remaining = 16;
      }
      this.nextRandom();
      this._part = 2;
      this.choosePattern();
    } else {
      road = this._remaining === 1;
      this.nextRandom();
    }
    const level = this.level();
    const rows = this.terrain(previous, this._pattern, (this._state & 128) !== 0);
    return {
      id: this._blocks.length,
      section: this._section,
      level,
      seed: this._seed,
      pattern: this._pattern,
      island: (this._state & 128) !== 0,
      road,
      rows,
      object: road
        ? { kind: 'bridge', x: 63, direction: 1, scale: 4 }
        : this.object(previous, level),
    };
  }

  private level(): number {
    return this._section <= 48 ? this._section : 47 + ((this._section - 49) % 2);
  }

  private nextRandom(): void {
    const high = this._seed >> 8;
    const carry = (((high << 3) ^ high) >> 7) & 1;
    this._seed = ((this._seed << 1) | carry) & 65535;
  }

  private choosePattern(): void {
    const level = this.level();
    if (this._remaining === 1) {
      this._state = 0;
      this._pattern = 12;
      return;
    }
    if (level % 2 === 1) {
      this._pattern = 7;
      return;
    }
    if (this._remaining === 2) {
      if (this._state === 192) {
        this._state = 128;
        this._pattern = 0;
        return;
      }
      this._state = 0;
    } else if (((this._state << 1) ^ this._state) & 128) {
      this._state = this._state & 64 ? 192 : 0;
    } else if ((this._seed & 48) === 0) {
      this._state = this._state & 128 ? 128 : 64;
      this._pattern = 0;
      return;
    }
    const maximum = level < 5 ? 8 : this._state & 128 ? 13 : 14;
    const candidate = this._seed & 15;
    this._pattern = Math.min(maximum, candidate < 2 ? candidate + 2 : candidate);
  }

  private terrain(previous: number, next: number, island: boolean): readonly number[] {
    const difference =
      previous === next ? 0 : previous > next ? previous - next - 1 : previous - next + 1;
    const index = Math.max(previous, next);
    let firstPage = 1;
    let secondPage = 0;
    let firstPointer = 0;
    let secondPointer = 0;
    if (index < 9) {
      firstPage = index === 0 ? 0 : 1;
      firstPointer = (RiverRaidTerrainPatterns.pointers[index] ?? 0) + difference;
    } else {
      firstPointer = previous < next && previous < 8 ? previous : next < 8 ? 14 - next : 7;
      secondPointer = (RiverRaidTerrainPatterns.pointers[index] ?? 0) + difference;
    }
    if (island) {
      [firstPointer, secondPointer] = [secondPointer, firstPointer];
      [firstPage, secondPage] = [secondPage, firstPage];
    }
    return Array.from({ length: 32 }, (_, line) => {
      const offset = Math.floor(line / 2);
      const pf1 = RiverRaidTerrainPatterns.pages[firstPage]?.[firstPointer + offset] ?? 0;
      const pf2 = RiverRaidTerrainPatterns.pages[secondPage]?.[secondPointer + offset] ?? 0;
      let bits = 15;
      for (let bit = 0; bit < 8; bit++) {
        if (pf1 & (128 >> bit)) bits |= 1 << (4 + bit);
        if (pf2 & (1 << bit)) bits |= 1 << (12 + bit);
      }
      return bits;
    });
  }

  private object(previous: number, level: number): IRiverRaidBlock['object'] {
    const low = this._seed & 255;
    const high = this._seed >> 8;
    const valley = level < 5 ? 6 : 0;
    const island = (this._state & 128) !== 0;
    let kind: IRiverRaidBlock['object']['kind'];
    if (this._remaining + this._part >= 18) kind = 'house';
    else if ((63 - level) * 2 < high) kind = ENEMIES[high & (level >= 3 ? 7 : 1)]!;
    else kind = low & 64 ? 'house' : 'fuel';
    let scale = kind === 'ship' || kind === 'house' ? 2 : 1;
    let x: number;
    let direction: -1 | 1 = low & 128 ? -1 : 1;
    const maximum = Math.max(previous, this._pattern);
    if (kind === 'house') {
      if (level % 2 === 1) {
        x = (low & 31) + 9;
        if (x >= 25) x += 93;
      } else
        x =
          island && Math.min(previous, this._pattern) !== 0
            ? 71
            : HOUSE_X[Math.min(previous, this._pattern)]!;
    } else if (previous === this._pattern && level % 2 === 1) {
      x = Math.min((scale === 2 ? 97 : 106) - valley, (low & 63) + 46 + valley);
    } else {
      if (kind === 'ship' && maximum > (island ? 10 : 13)) {
        kind = 'helicopter';
        scale = 1;
      }
      const outsideIsland = island && maximum > 0;
      const edge = outsideIsland ? 80 - maximum * 4 : 16 + maximum * 4;
      const subtraction = (kind === 'fuel' ? 9 : 10) + valley + (scale === 2 ? 10 : 0);
      if (outsideIsland) {
        x = low & 128 ? 160 - edge + 2 + valley : edge - subtraction;
        direction = low & 128 ? 1 : -1;
      } else x = low & 128 ? 160 - edge - subtraction : edge + 2 + valley;
    }
    return { kind, x, scale, direction: kind === 'fuel' ? 1 : direction };
  }

  // #endregion
}
