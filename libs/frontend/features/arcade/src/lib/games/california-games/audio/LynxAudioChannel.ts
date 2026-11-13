/** A deterministic mono voice inspired by one of the Atari Lynx's four identical audio channels. @public */
export class LynxAudioChannel {
  // #region Fields

  private _phase = 0;
  private _lfsr = 0xace;
  private _integrated = 0;
  private readonly _sampleRate: number;

  // #endregion

  // #region Ctor

  /** Creates a voice for a fixed browser output sample rate. @public */
  public constructor(sampleRate: number) {
    this._sampleRate = sampleRate;
  }

  // #endregion

  // #region Methods

  /** Mixes a signed-volume tone or twelve-bit polynomial-noise register interval into a mono buffer. @public */
  public sample(
    target: Float32Array,
    offset: number,
    length: number,
    waveform: 'tone' | 'noise',
    frequency: number,
    volume: number,
    integrate = false,
  ): void {
    const end = Math.min(target.length, offset + length);
    const level = Math.max(-127, Math.min(127, volume)) / 127 / 4;
    const increment = Math.max(0, frequency) / this._sampleRate;
    for (let sample = Math.max(0, offset); sample < end; sample++) {
      this._phase += increment;
      if (this._phase >= 1) {
        this._phase -= Math.floor(this._phase);
        if (waveform === 'noise') this.advancePolynomial();
      }
      const polarity =
        waveform === 'tone' ? (this._phase < 0.5 ? 1 : -1) : (this._lfsr & 1) === 0 ? -1 : 1;
      if (integrate) {
        this._integrated = Math.max(-1, Math.min(1, this._integrated + polarity * level * 0.08));
        target[sample] = (target[sample] ?? 0) + this._integrated;
      } else {
        this._integrated *= 0.92;
        target[sample] = (target[sample] ?? 0) + polarity * level;
      }
    }
  }

  /** Restores the polynomial and phase state for a new game. @public */
  public reset(): void {
    this._phase = 0;
    this._lfsr = 0xace;
    this._integrated = 0;
  }

  private advancePolynomial(): void {
    const feedback =
      ((this._lfsr >> 0) ^ (this._lfsr >> 1) ^ (this._lfsr >> 4) ^ (this._lfsr >> 6)) & 1;
    this._lfsr = (this._lfsr >> 1) | (feedback << 11);
    if (this._lfsr === 0) this._lfsr = 0xace;
  }

  // #endregion
}
