// #region Imports

import { CaliforniaGamesEffects } from './CaliforniaGamesEffects';
import { CaliforniaGamesMusic } from './CaliforniaGamesMusic';
import type { CaliforniaGamesMusicCue } from './CaliforniaGamesMusicCue';
import type { ICaliforniaGamesAudioSnapshot } from './ICaliforniaGamesAudioSnapshot';
import type { ICaliforniaGamesSoundEvent } from './ICaliforniaGamesSoundEvent';

// #endregion

/** Gesture-unlocked mono four-channel audio adapter for the reconstructed Lynx soundtrack. @public */
export class CaliforniaGamesAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _master: GainNode | undefined;
  private _musicSource: AudioBufferSourceNode | undefined;
  private readonly _effectSources = new Set<AudioBufferSourceNode>();
  private readonly _musicBuffers = new Map<CaliforniaGamesMusicCue, AudioBuffer>();
  private readonly _effectBuffers = new Map<ICaliforniaGamesSoundEvent['kind'], AudioBuffer>();
  private _music: CaliforniaGamesMusicCue = 'silent';
  private _musicId = -1;
  private _lastSoundId = 0;
  private _status: ICaliforniaGamesAudioSnapshot['status'] = 'paused';
  private _muted = false;
  private _disposed = false;

  // #endregion

  // #region Methods

  /** Creates and resumes browser audio only after an explicit player gesture. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    try {
      if (!this._context) {
        this._context = new AudioContext();
        this._master = this._context.createGain();
        this._master.gain.value = this._muted ? 0 : 0.42;
        this._master.connect(this._context.destination);
      }
      await this._context.resume();
      if (this._status === 'running' && !this._musicSource) this.startMusic();
    } catch {
      // Revoked browser audio permission never prevents the game from advancing.
    }
  }

  /** Applies ordered music changes and plays every simulation effect at most once. @public */
  public update(snapshot: ICaliforniaGamesAudioSnapshot): void {
    if (this._disposed) return;
    if (snapshot.musicId < this._musicId) {
      this._lastSoundId = 0;
      this._musicId = -1;
    }
    const musicChanged = snapshot.musicId !== this._musicId || snapshot.music !== this._music;
    this._status = snapshot.status;
    if (musicChanged) {
      this.stopMusic();
      this._music = snapshot.music;
      this._musicId = snapshot.musicId;
    }
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastSoundId) continue;
      this._lastSoundId = event.id;
      if (snapshot.status === 'running') this.playEffect(event.kind);
    }
    if (snapshot.status === 'paused') {
      this.stopMusic();
      return;
    }
    if (this._context?.state === 'running' && !this._musicSource) this.startMusic();
  }

  /** Applies the sound preference without recreating or rephasing the audio context. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._context && this._master)
      this._master.gain.setValueAtTime(muted ? 0 : 0.42, this._context.currentTime);
  }

  /** Clears queued output and event de-duplication when a new game is constructed. @public */
  public reset(): void {
    if (this._disposed) return;
    this.stopMusic();
    this.stopEffects();
    this._music = 'silent';
    this._musicId = -1;
    this._lastSoundId = 0;
    this._status = 'paused';
  }

  /** Stops active voices and suspends audio while the game or application is paused. @public */
  public suspend(): void {
    this.stopMusic();
    this.stopEffects();
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Releases all Web Audio nodes and the context exactly once when the route closes. @public */
  public dispose(): void {
    if (this._disposed) return;
    this.stopMusic();
    this.stopEffects();
    this._disposed = true;
    this._musicBuffers.clear();
    this._effectBuffers.clear();
    this._master?.disconnect();
    if (this._context && this._context.state !== 'closed')
      void this._context.close().catch(() => undefined);
    this._context = undefined;
    this._master = undefined;
  }

  private startMusic(): void {
    const context = this._context;
    if (
      !context ||
      context.state !== 'running' ||
      !this._master ||
      this._music === 'silent' ||
      this._status !== 'running'
    )
      return;
    let buffer = this._musicBuffers.get(this._music);
    if (!buffer) {
      const samples = CaliforniaGamesMusic.render(this._music, context.sampleRate);
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      this._musicBuffers.set(this._music, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this._master);
    source.onended = () => {
      source.disconnect();
      if (this._musicSource === source) this._musicSource = undefined;
    };
    this._musicSource = source;
    source.start();
  }

  private playEffect(kind: ICaliforniaGamesSoundEvent['kind']): void {
    const context = this._context;
    if (!context || context.state !== 'running' || !this._master) return;
    let buffer = this._effectBuffers.get(kind);
    if (!buffer) {
      const samples = CaliforniaGamesEffects.render(kind, context.sampleRate);
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      this._effectBuffers.set(kind, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this._master);
    source.onended = () => {
      source.disconnect();
      this._effectSources.delete(source);
    };
    this._effectSources.add(source);
    source.start();
  }

  private stopMusic(): void {
    const source = this._musicSource;
    this._musicSource = undefined;
    if (!source) return;
    source.onended = null;
    source.stop();
    source.disconnect();
  }

  private stopEffects(): void {
    for (const source of this._effectSources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this._effectSources.clear();
  }

  // #endregion
}
