// #region Imports

import type { IBoxingSnapshot } from '../model/IBoxingSnapshot';
import type { IBoxingSoundEvent } from '../model/IBoxingSoundEvent';

// #endregion

/** Synthesizes short retro boxing effects from match events without external assets. @public */
export class RealsportsBoxingAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _gain: GainNode | undefined;
  private _lastId = 0;
  private _lastFrame = 0;
  private readonly _voices = new Set<OscillatorNode>();
  private _muted = false;
  private _disposed = false;

  // #endregion

  // #region Methods

  /** Unlocks sound only from an explicit user gesture. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    if (!this._context) {
      this._context = new AudioContext();
      this._gain = this._context.createGain();
      this._gain.gain.value = this._muted ? 0 : 0.1;
      this._gain.connect(this._context.destination);
    }
    try {
      await this._context.resume();
    } catch {
      /* Playing remains available when audio is denied. */
    }
  }

  /**
   * Plays each event once; attract fights are silent until explicitly played.
   * @param snapshot - Current model frame.
   * @param active - Whether a user-owned match is visible.
   * @public
   */
  public update(snapshot: IBoxingSnapshot, active: boolean): void {
    if (snapshot.frame < this._lastFrame) {
      for (const voice of this._voices) voice.stop();
      this._voices.clear();
    }
    this._lastFrame = snapshot.frame;
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastId) continue;
      this._lastId = event.id;
      if (active && this._context?.state === 'running') this.play(event.kind);
    }
  }

  /** Applies the user's sound choice without changing the simulation. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._context && this._gain)
      this._gain.gain.setValueAtTime(muted ? 0 : 0.1, this._context.currentTime);
  }

  /** Freezes audio whenever a match is paused or loses focus. @public */
  public suspend(): void {
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Releases the browser audio context when the game route closes. @public */
  public dispose(): void {
    this._disposed = true;
    for (const voice of this._voices) voice.stop();
    this._voices.clear();
    if (this._context) void this._context.close().catch(() => undefined);
    this._gain?.disconnect();
    this._context = undefined;
    this._gain = undefined;
  }

  private play(kind: IBoxingSoundEvent['kind']): void {
    if (!this._context || !this._gain) return;
    const notes =
      kind === 'bell'
        ? [880, 660, 880]
        : kind === 'victory'
          ? [440, 554, 660, 880]
          : kind === 'count'
            ? [330]
            : kind === 'block'
              ? [170]
              : kind === 'knockdown'
                ? [220, 165, 110]
                : kind === 'payoff'
                  ? [95, 65]
                  : kind === 'body'
                    ? [125, 75]
                    : [180, 110];
    const oscillator = this._context.createOscillator();
    const envelope = this._context.createGain();
    const now = this._context.currentTime;
    const duration = kind === 'victory' || kind === 'bell' ? 0.13 : 0.045;
    oscillator.type = kind === 'bell' ? 'triangle' : 'square';
    oscillator.connect(envelope);
    envelope.connect(this._gain);
    notes.forEach((frequency, index) =>
      oscillator.frequency.setValueAtTime(frequency, now + index * duration),
    );
    envelope.gain.setValueAtTime(0.8, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + notes.length * duration);
    this._voices.add(oscillator);
    oscillator.start(now);
    oscillator.stop(now + notes.length * duration);
    oscillator.onended = () => {
      this._voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  // #endregion
}
