/** Portable, locally rendered employee identity, independent of the executing CLI. */
export interface IAgentAppearance {
  /** Legacy figure IDs remain readable; new appearances use the original Dot catalogue. */
  readonly figure: 'dot' | 'pebble' | 'arch' | 'kite' | 'sprout';
  readonly color: 'coral' | 'mint' | 'blue' | 'violet' | 'gold' | 'rose';
  /** Legacy layers remain readable. Original characters include their own accessories. */
  readonly accessories: readonly ('glasses' | 'headphones' | 'badge')[];
  /** Bounded PNG data URL. No remote tracking URLs or filesystem paths cross the renderer. */
  readonly image?: string;
}
