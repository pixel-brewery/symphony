/**
 * Original RightRandom feedback polynomial; zero is excluded from the world.
 * @param seed - Current nonzero eight-bit room seed.
 * @public
 */
export function nextPitfallSeed(seed: number): number {
  return ((seed << 1) | (((seed >> 3) ^ (seed >> 4) ^ (seed >> 5) ^ (seed >> 7)) & 1)) & 255;
}
