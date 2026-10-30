/** Immutable geometry of the complete eight-chamber, 28-level Atari 2600 cavern. @public */
export interface IPitfallIIWorld {
  readonly width: number;
  readonly height: number;
  readonly chamberWidth: number;
  readonly levelHeight: number;
  readonly surfaceY: number;
  readonly platforms: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
  readonly walls: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
  readonly ladders: readonly { readonly x: number; readonly y: number; readonly height: number }[];
  readonly water: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
  readonly items: readonly {
    readonly id: string;
    readonly kind: 'gold' | 'rhonda' | 'quickclaw' | 'diamond' | 'rat';
    readonly x: number;
    readonly y: number;
  }[];
  readonly checkpoints: readonly { readonly id: number; readonly x: number; readonly y: number }[];
  readonly hazards: readonly {
    readonly id: number;
    readonly kind: 'bat' | 'balloonBat' | 'condor' | 'frog' | 'scorpion' | 'eel';
    readonly x: number;
    readonly y: number;
  }[];
}
