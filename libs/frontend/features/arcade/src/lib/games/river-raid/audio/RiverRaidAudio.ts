// #region Imports

import type { IRiverRaidSnapshot } from '../model/IRiverRaidSnapshot';
import { ArcadeTiaAudioChannel } from '../../shared/audio/ArcadeTiaAudioChannel';

// #endregion

/** Two TIA register channels rendered through the existing Atari audio sampler. @public */
export class RiverRaidAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _gain: GainNode | undefined;
  private readonly _sources = new Set<AudioBufferSourceNode>();
  private _muted = false;
  private _disposed = false;
  private _lastFrame = -1;
  private _until = 0;
  private _channels: ArcadeTiaAudioChannel[] = [];

  // #endregion

  // #region Methods

  /** Unlocks audio from a deliberate game gesture; missing browser audio never prevents play. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    if (!this._context) {
      this._context = new AudioContext();
      this._channels = [
        new ArcadeTiaAudioChannel(this._context.sampleRate),
        new ArcadeTiaAudioChannel(this._context.sampleRate),
      ];
      this._gain = this._context.createGain();
      this._gain.gain.value = this._muted ? 0 : 0.45;
      this._gain.connect(this._context.destination);
    }
    if (this._context.state === 'suspended') await this._context.resume().catch(() => undefined);
  }

  /** Schedules each fresh register frame once and drops stale browser catch-up instead of replaying it. @public */
  public update(snapshot: IRiverRaidSnapshot): void {
    if (this._disposed || this._lastFrame === snapshot.frame) return;
    const frames = snapshot.audioFrames.filter((frame) => frame.frame > this._lastFrame);
    this._lastFrame = snapshot.frame;
    const context = this._context;
    if (
      !context ||
      context.state !== 'running' ||
      !this._gain ||
      !frames.length ||
      snapshot.status === 'paused' ||
      snapshot.status === 'ready' ||
      snapshot.status === 'ended'
    )
      return;
    if (this._until - context.currentTime > 0.15) this.clearSources();
    const channels = this._channels.map((channel, index) =>
      channel.sample(frames.map((frame) => frame.channels[index] ?? [0, 0, 0])),
    );
    if (!channels[0]?.length) return;
    const buffer = context.createBuffer(1, channels[0].length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (const channel of channels)
      for (let i = 0; i < samples.length; i++) samples[i] = samples[i]! + (channel[i] ?? 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this._gain);
    source.onended = () => {
      source.disconnect();
      this._sources.delete(source);
    };
    this._sources.add(source);
    const start = Math.max(context.currentTime, this._until);
    source.start(start);
    this._until = Math.max(context.currentTime, this._until) + buffer.duration;
  }

  /** Clears queued output when a new game begins. @public */
  public reset(): void {
    this.clearSources();
    this._lastFrame = -1;
    for (const channel of this._channels) channel.reset();
  }

  /** Changes sound preference without recreating the AudioContext. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._gain && this._context)
      this._gain.gain.setValueAtTime(muted ? 0 : 0.45, this._context.currentTime);
  }

  /** Stops pending cues on menus, pause and focus loss. @public */
  public suspend(): void {
    this.clearSources();
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Releases browser audio exactly once when the game route closes. @public */
  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.reset();
    this._gain?.disconnect();
    if (this._context && this._context.state !== 'closed')
      void this._context.close().catch(() => undefined);
    this._context = undefined;
  }

  private clearSources(): void {
    for (const source of this._sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this._sources.clear();
    this._until = this._context?.currentTime ?? 0;
  }

  // #endregion
}
