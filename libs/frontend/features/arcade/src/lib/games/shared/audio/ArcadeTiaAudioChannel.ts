/** Samples the Arcade TIA register modes while retaining oscillator phase between scheduled batches. @public */
export class ArcadeTiaAudioChannel {
  // #region Fields

  private readonly _sampleRate: number;
  private _frames = 0;
  private _elapsedClocks = 0;
  private _divider = 0;
  private _poly4 = 15;
  private _poly5 = 31;
  private _poly9 = 511;
  private _divideThree = 0;
  private _tone = 1;
  private _output = 1;

  // #endregion

  // #region Ctor

  /** Sets the browser output rate for one independent hardware channel. @public */
  public constructor(sampleRate: number) {
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
      throw new RangeError('Atari audio requires a sample rate between 8 and 192 kHz.');
    this._sampleRate = sampleRate;
  }

  // #endregion

  // #region Methods

  /** Renders successive 60 Hz register frames without restarting divider or polynomial state. @public */
  public sample(
    frames: readonly (readonly [control: number, frequency: number, volume: number])[],
  ): Float32Array<ArrayBuffer> {
    const startSample = Math.ceil((this._frames * this._sampleRate) / 60);
    const endSample = Math.ceil(((this._frames + frames.length) * this._sampleRate) / 60);
    const samples = new Float32Array(endSample - startSample);
    for (let sample = startSample; sample < endSample; sample++) {
      const [control, frequency, volume] =
        frames[Math.floor((sample * 60) / this._sampleRate) - this._frames]!;
      const targetClocks = Math.floor((sample * 31_399.5) / this._sampleRate);
      while (this._elapsedClocks < targetClocks) {
        this._elapsedClocks++;
        if (this._divider !== frequency && this._divider !== 31) {
          this._divider++;
          continue;
        }
        this._divider = 0;
        switch (control) {
          case 0:
            this._output = 1;
            break;
          case 1:
            this._output = this._poly4 & 1;
            this._poly4 = (this._poly4 >> 1) | (((this._poly4 ^ (this._poly4 >> 1)) & 1) << 3);
            break;
          case 4:
            this._tone ^= 1;
            this._output = this._tone;
            break;
          case 8:
            this._output = this._poly9 & 1;
            this._poly9 = (this._poly9 >> 1) | (((this._poly9 ^ (this._poly9 >> 4)) & 1) << 8);
            break;
          case 12:
            if (++this._divideThree === 3) {
              this._divideThree = 0;
              this._tone ^= 1;
            }
            this._output = this._tone;
            break;
          case 15: {
            // AUDC 15 gates the divide-six tone with poly5; it is not slowed poly5 noise.
            const gate = this._poly5 & 1;
            this._poly5 = (this._poly5 >> 1) | (((this._poly5 ^ (this._poly5 >> 2)) & 1) << 4);
            if (gate && ++this._divideThree === 3) {
              this._divideThree = 0;
              this._tone ^= 1;
            }
            this._output = this._tone;
            break;
          }
          default:
            throw new RangeError('Unsupported Atari TIA control.');
        }
      }
      samples[sample - startSample] = ((this._output ? 1 : -1) * volume) / 60;
    }
    this._frames += frames.length;
    return samples;
  }

  /** Restores power-on phase for a new session without changing the output rate. @public */
  public reset(): void {
    this._frames = 0;
    this._elapsedClocks = 0;
    this._divider = 0;
    this._poly4 = 15;
    this._poly5 = 31;
    this._poly9 = 511;
    this._divideThree = 0;
    this._tone = 1;
    this._output = 1;
  }

  // #endregion
}
