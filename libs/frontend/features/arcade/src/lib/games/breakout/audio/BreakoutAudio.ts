// #region Imports

import type { IBreakoutSnapshot } from '../model/IBreakoutSnapshot';

// #endregion

const CUES: Readonly<
  Record<IBreakoutSnapshot['soundEvents'][number]['kind'], readonly [number, number, number]>
> = {
  serve: [220, 440, 0.07],
  paddle: [330, 330, 0.035],
  wall: [660, 660, 0.025],
  brickLow: [440, 440, 0.045],
  brickMid: [660, 660, 0.045],
  brickHigh: [880, 880, 0.045],
  miss: [110, 55, 0.22],
  complete: [880, 1320, 0.18],
};

/** Short single-channel paddle-game cues synthesized after a trusted browser gesture. @public */
export class BreakoutAudio {
  // #region Fields

  private _context: AudioContext | null = null;
  private _oscillator: OscillatorNode | null = null;
  private _gain: GainNode | null = null;
  private _muted = false;
  private _disposed = false;
  private _lastEventId = 0;
  private _lastFrame = 0;

  // #endregion

  // #region Methods

  /** Enables sound only when the owning view receives an explicit user gesture. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    if (!this._context) {
      this._context = new AudioContext();
      this._gain = this._context.createGain();
      this._gain.gain.value = 0;
      this._gain.connect(this._context.destination);
      this._oscillator = this._context.createOscillator();
      this._oscillator.type = 'square';
      this._oscillator.connect(this._gain);
      this._oscillator.start();
    }
    if (this._context.state === 'suspended') {
      try {
        await this._context.resume();
      } catch {
        /* Browser audio permission does not gate gameplay. */
      }
    }
  }

  /**
   * Plays each collision cue once, replacing the previous tone as a one-channel console does.
   * @param snapshot - Current ordered simulation events.
   * @public
   */
  public update(snapshot: IBreakoutSnapshot): void {
    if (this._disposed) return;
    if (snapshot.frame < this._lastFrame) this.silence();
    this._lastFrame = snapshot.frame;
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastEventId) continue;
      this._lastEventId = event.id;
      if (this._muted || this._context?.state !== 'running' || !this._oscillator || !this._gain)
        continue;
      const [frequency, endFrequency, duration] = CUES[event.kind];
      const now = this._context.currentTime;
      this._oscillator.frequency.cancelScheduledValues(now);
      this._gain.gain.cancelScheduledValues(now);
      this._oscillator.frequency.setValueAtTime(frequency, now);
      this._oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration);
      this._gain.gain.setValueAtTime(0.035, now);
      this._gain.gain.setValueAtTime(0, now + duration);
    }
  }

  /**
   * Changes the user's sound preference without replaying collisions when unmuting.
   * @param muted - Whether sound is suppressed.
   * @public
   */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (muted) this.silence();
  }

  /** Freezes the audio clock along with a paused game. @public */
  public suspend(): void {
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Releases the oscillator and browser audio resources. @public */
  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._oscillator?.stop();
    this._gain?.disconnect();
    if (this._context?.state !== 'closed') void this._context?.close().catch(() => undefined);
    this._context = null;
    this._oscillator = null;
    this._gain = null;
  }

  private silence(): void {
    if (!this._context || !this._gain) return;
    this._gain.gain.cancelScheduledValues(this._context.currentTime);
    this._gain.gain.setValueAtTime(0, this._context.currentTime);
  }

  // #endregion
}
