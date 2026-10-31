// #region Imports

import type { IJungleHuntSnapshot } from '../model/IJungleHuntSnapshot';
import { synthesizeJungleHuntSound } from './synthesizeJungleHuntSound';

// #endregion

/** Gesture-unlocked two-channel-style audio with complete pause, mute and disposal ownership. @public */
export class JungleHuntAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _gain: GainNode | undefined;
  private _lastId = 0;
  private _muted = false;
  private _disposed = false;
  private readonly _voices = new Set<AudioBufferSourceNode>();

  // #endregion

  // #region Methods

  /** Creates or resumes audio only after a playfield or sound-button gesture. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    try {
      if (!this._context) {
        this._context = new AudioContext();
        this._gain = this._context.createGain();
        this._gain.gain.value = this._muted ? 0 : 0.65;
        this._gain.connect(this._context.destination);
      }
      await this._context.resume();
    } catch {
      // Audio rejection never prevents play.
    }
  }

  /** Plays each ordered simulation effect once, including effects queued before audio unlock. @public */
  public update(snapshot: IJungleHuntSnapshot): void {
    if (!this._context || !this._gain || this._context.state !== 'running') return;
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastId) continue;
      this._lastId = event.id;
      if (this._muted) continue;
      const samples = synthesizeJungleHuntSound(event.kind, this._context.sampleRate);
      const buffer = this._context.createBuffer(1, samples.length, this._context.sampleRate);
      buffer.getChannelData(0).set(samples);
      const voice = this._context.createBufferSource();
      voice.buffer = buffer;
      voice.connect(this._gain);
      this._voices.add(voice);
      voice.onended = () => {
        this._voices.delete(voice);
        voice.disconnect();
      };
      voice.start();
    }
  }

  /** Immediately applies the sound preference, including already-playing voices. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._gain && this._context)
      this._gain.gain.setValueAtTime(muted ? 0 : 0.65, this._context.currentTime);
  }

  /** Stops pending notes while retaining the context for the next explicit resume. @public */
  public suspend(): void {
    this.stopVoices();
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Cancels the previous run's sound without discarding the user's mute preference. @public */
  public reset(): void {
    this.stopVoices();
    this._lastId = 0;
  }

  /** Releases audio nodes and the browser context when the lazy route closes. @public */
  public dispose(): void {
    this._disposed = true;
    this.stopVoices();
    this._gain?.disconnect();
    if (this._context) void this._context.close().catch(() => undefined);
    this._context = undefined;
    this._gain = undefined;
  }

  private stopVoices(): void {
    for (const voice of this._voices) {
      voice.stop();
      voice.disconnect();
    }
    this._voices.clear();
  }

  // #endregion
}
