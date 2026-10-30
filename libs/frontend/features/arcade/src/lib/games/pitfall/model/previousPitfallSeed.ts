/**
 * Original LeftRandom inverse feedback polynomial.
 * @param seed - Current nonzero eight-bit room seed.
 * @public
 */
export function previousPitfallSeed(seed: number): number {
  return (seed >> 1) | ((((seed >> 4) ^ (seed >> 5) ^ (seed >> 6) ^ seed) & 1) << 7);
}
