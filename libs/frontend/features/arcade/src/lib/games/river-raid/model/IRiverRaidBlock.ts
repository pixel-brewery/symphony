/** One original 32-scanline river part and its deterministically placed object. @public */
export interface IRiverRaidBlock {
  readonly id: number;
  readonly section: number;
  readonly level: number;
  readonly seed: number;
  readonly pattern: number;
  readonly island: boolean;
  readonly road: boolean;
  readonly rows: readonly number[];
  readonly object: {
    readonly kind: 'ship' | 'helicopter' | 'jet' | 'fuel' | 'house' | 'bridge';
    readonly x: number;
    readonly direction: -1 | 1;
    readonly scale: number;
  };
}
