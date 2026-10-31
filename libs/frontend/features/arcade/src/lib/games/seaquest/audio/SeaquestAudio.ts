// #region Imports

import { ArcadeTiaAudioChannel } from '../../shared/audio/ArcadeTiaAudioChannel';
import type { ISeaquestSoundEvent } from '../model/ISeaquestSoundEvent';
import { seaquestSoundFrames } from './seaquestSoundFrames';

// #endregion

/** Original Seaquest register effects, owned and unlocked by the game View. @public */
export class SeaquestAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _master: GainNode | undefined;
  private readonly _sources: (AudioBufferSourceNode | undefined)[] = [undefined, undefined];
  private _muted = false;
  private _disposed = false;
  private _lastEvent = 0;

  // #endregion

  // #region Methods

  /** Opens browser audio only following the owning View's explicit player gesture. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    try {
      if (!this._context) {
        this._context = new AudioContext();
        this._master = this._context.createGain();
        this._master.gain.value = this._muted ? 0 : 0.35;
        this._master.connect(this._context.destination);
      }
      if (this._context.state === 'suspended') await this._context.resume();
    } catch {
      /* Browser audio denial does not stop play. */
    }
  }

  /** Consumes each model event once, including events observed while audio is unavailable. @public */
  public consume(events: readonly ISeaquestSoundEvent[]): void {
    if (this._disposed) return;
    for (const event of events) {
      if (event.id <= this._lastEvent) continue;
      this._lastEvent = event.id;
      if (this._context?.state !== 'running' || !this._master) continue;
      const channels = seaquestSoundFrames(event);
      for (const [channel, frames] of channels.entries()) {
        if (frames.length === 0) continue;
        this.stopChannel(channel);
        if (frames.every((frame) => frame[2] === 0)) continue;
        const samples = new ArcadeTiaAudioChannel(this._context.sampleRate).sample(frames);
        const buffer = this._context.createBuffer(1, samples.length, this._context.sampleRate);
        buffer.getChannelData(0).set(samples);
        const source = this._context.createBufferSource();
        source.buffer = buffer;
        source.connect(this._master);
        source.onended = () => {
          source.disconnect();
          if (this._sources[channel] === source) this._sources[channel] = undefined;
        };
        this._sources[channel] = source;
        source.start();
      }
    }
  }

  /** Silences a new game while preserving the model's lifetime-unique event watermark. @public */
  public reset(): void {
    this.stopChannel(0);
    this.stopChannel(1);
  }

  /** Keeps muted effects advancing so unmuting cannot replay an earlier action. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._context && this._master)
      this._master.gain.setTargetAtTime(muted ? 0 : 0.35, this._context.currentTime, 0.008);
  }

  /** Freezes sound with the game when a menu opens or the application loses focus. @public */
  public suspend(): void {
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Releases both cartridge channels and the browser audio context on route teardown. @public */
  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.reset();
    this._master?.disconnect();
    if (this._context && this._context.state !== 'closed')
      void this._context.close().catch(() => undefined);
    this._context = undefined;
    this._master = undefined;
  }

  private stopChannel(channel: number): void {
    const source = this._sources[channel];
    if (!source) return;
    this._sources[channel] = undefined;
    source.onended = null;
    source.stop();
    source.disconnect();
  }

  // #endregion
}
