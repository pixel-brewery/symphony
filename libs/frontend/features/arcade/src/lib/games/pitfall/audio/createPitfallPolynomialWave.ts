/**
 * Synthesizes the TIA's repeating four- or five-bit polynomial waveform.
 * Analytic Fourier coefficients retain the stepped duty cycle without a sampled asset.
 *
 * @param context - The browser audio context that will own the periodic wave.
 * @param bits - Four for the melody channel, five for rolling-log contact noise.
 * @returns A band-limited browser waveform with the original polynomial period.
 * @public
 */
export function createPitfallPolynomialWave(context: BaseAudioContext, bits: 4 | 5): PeriodicWave {
  const period = (1 << bits) - 1;
  const samples: number[] = [];
  let register = period;
  for (let step = 0; step < period; step++) {
    samples.push((register & 1) === 0 ? -1 : 1);
    const tap = bits === 4 ? 1 : 2;
    const feedback = ((register >> tap) ^ register) & 1;
    register = (register >> 1) | (feedback << (bits - 1));
  }
  const real = new Float32Array(129);
  const imaginary = new Float32Array(129);
  for (let harmonic = 1; harmonic < real.length; harmonic++) {
    for (const [index, value] of samples.entries()) {
      const start = (Math.PI * 2 * harmonic * index) / period;
      const end = (Math.PI * 2 * harmonic * (index + 1)) / period;
      real[harmonic] =
        (real[harmonic] ?? 0) + (value * (Math.sin(end) - Math.sin(start))) / (Math.PI * harmonic);
      imaginary[harmonic] =
        (imaginary[harmonic] ?? 0) +
        (value * (Math.cos(start) - Math.cos(end))) / (Math.PI * harmonic);
    }
  }
  return context.createPeriodicWave(real, imaginary);
}
