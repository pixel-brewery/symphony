/** A decoded original Atari room, in 160 × 192 pixel coordinates. @public */
export interface IPitfallRoom {
  readonly index: number;
  readonly seed: number;
  readonly sceneType: number;
  readonly objectType: number;
  readonly treePattern: number;
  readonly trees: readonly number[];
  /** Player left coordinate when aligned with the ladder centered at x80. */
  readonly ladderX: number | null;
  readonly wall: { readonly x: number; readonly width: number } | null;
  readonly holes: readonly { readonly x: number; readonly width: number }[];
  readonly pit: {
    readonly kind: 'water' | 'tar' | 'quicksand';
    readonly x: number;
    readonly width: number;
    readonly shifting: boolean;
    readonly phase: 'open' | 'closing' | 'closed' | 'opening';
  } | null;
  readonly crocodiles: readonly {
    readonly x: number;
    readonly width: number;
    readonly mouthOpen: boolean;
  }[];
  readonly logs: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly moving: boolean;
    readonly animationFrame: number;
  }[];
  readonly obstacle: {
    readonly kind: 'fire' | 'snake';
    readonly x: number;
    readonly animationFrame: number;
  } | null;
  readonly treasure: {
    readonly kind: 'moneyBag' | 'silver' | 'gold' | 'diamond';
    readonly x: number;
    readonly value: number;
    readonly animationFrame: number;
  } | null;
  readonly scorpion: { readonly x: number; readonly facing: -1 | 1 } | null;
  readonly vine: boolean;
}
