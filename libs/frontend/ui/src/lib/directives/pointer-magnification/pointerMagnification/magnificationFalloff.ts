/**
 * The raised-cosine (Hann) bell that shapes the magnification: `1` under the pointer, `0` at
 * `radius` and beyond. Its derivative is zero at both ends, which is what separates it from the
 * obvious triangular falloff: a tent has slope -1 at the cursor, so the growth rate reverses
 * discontinuously as the pointer crosses a cell centre and the row visibly creases. Because the
 * displacement below integrates this field, a merely continuous falloff yields motion the eye
 * reads as a hinge. A Hermite smoothstep is within 0.01 of this curve everywhere and would do as
 * well; the cosine is kept because a Hann kernel sampled on a lattice of pitch `p` sums to a
 * constant whenever `radius / p` is a multiple of one half, so the row's total growth - and
 * therefore the space it needs - does not breathe while the pointer sweeps.
 */
export function magnificationFalloff(distance: number, radius: number): number {
  if (!(radius > 0)) return 0;
  const normalized = Math.abs(distance) / radius;
  if (normalized >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * normalized));
}
