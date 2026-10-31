// #region Imports

import type { IPitfallIISnapshot } from '../model/IPitfallIISnapshot';
import type { IPitfallIISoundEvent } from '../model/IPitfallIISoundEvent';
import { PitfallIIMusic } from './PitfallIIMusic';
import { synthesizePitfallIIEffect } from './synthesizePitfallIIEffect';
import { synthesizePitfallIIMusic } from './synthesizePitfallIIMusic';

// #endregion

/** Original DPC arrangements and TIA effects, unlocked by a player gesture and owned by the game View. @public */
export class PitfallIIAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _master: GainNode | undefined;
  private _percussion: GainNode | undefined;
  private _splitter: ChannelSplitterNode | undefined;
  private _source: AudioBufferSourceNode | undefined;
  private _effect: AudioBufferSourceNode | undefined;
  private readonly _buffers = new Map<number, AudioBuffer>();
  private _muted = false;
  private _disposed = false;
  private _mode: 0 | 1 | 2 | 3 = 0;
  private _lastEvent = 0;
  private _lastFrame = 0;
  private _hurtUntil = 0;
  private _modeEndsAt = Infinity;
  private _effectUntil = 0;

  // #endregion

  // #region Methods

  /** Opens browser audio only following an explicit play, resume or input gesture. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    if (!this._context) {
      this._context = new AudioContext();
      this._master = this._context.createGain();
      this._master.gain.value = this._muted ? 0 : 0.35;
      this._master.connect(this._context.destination);
      this._percussion = this._context.createGain();
      this._percussion.gain.value = 1;
      this._percussion.connect(this._master);
    }
    if (this._context.state === 'suspended') {
      try {
        await this._context.resume();
      } catch {
        /* Revoked audio permission does not stop play. */
      }
    }
  }

  /** Follows original event-driven music changes, including the silent injury freeze. @public */
  public update(snapshot: IPitfallIISnapshot): void {
    if (this._disposed) return;
    if (snapshot.totalFrames < this._lastFrame) {
      this.reset();
    }
    this._lastFrame = snapshot.totalFrames;
    if (this._context && this._context.currentTime >= this._modeEndsAt) {
      this._mode = 1;
      this._modeEndsAt = Infinity;
    }
    let restart: 0 | 1 | 2 | 3 | undefined;
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastEvent) continue;
      this._lastEvent = event.id;
      if (event.kind === 'hurt') {
        this.stopMusic();
        this.stopEffect();
        this._hurtUntil = (event.frame ?? snapshot.totalFrames) + 128;
        this._mode = 2;
        restart = undefined;
      } else if (
        (event.kind === 'treasure' || event.kind === 'victory') &&
        (restart ?? this._mode) !== 0
      )
        restart = 0;
      else if (event.kind === 'balloon') restart = 3;
      else if (event.kind === 'pop') restart = 1;
      this.playEffect(
        event.kind,
        Math.max(0, snapshot.totalFrames - (event.frame ?? snapshot.totalFrames)),
      );
    }
    if (restart !== undefined) {
      this.stopMusic();
      this._mode = restart;
    }
    if (snapshot.status === 'paused' || snapshot.totalFrames < this._hurtUntil) return;
    if (this._context?.state === 'running' && !this._source) this.startMusic(this._mode);
  }

  /** Restarts the original opening even when New Game is pressed before the first simulation frame. @public */
  public reset(): void {
    if (this._disposed) return;
    this.stopMusic();
    this.stopEffect();
    this._mode = 0;
    this._hurtUntil = 0;
    this._lastFrame = 0;
  }

  /** Keeps playback advancing silently so unmuting never replays an old sound. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._context && this._master)
      this._master.gain.setTargetAtTime(muted ? 0 : 0.35, this._context.currentTime, 0.008);
  }

  /** Freezes audio when a menu opens, the game pauses or the application loses focus. @public */
  public suspend(): void {
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Releases every source and the AudioContext when the lazy game route closes. @public */
  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.stopMusic();
    this.stopEffect();
    this._master?.disconnect();
    this._percussion?.disconnect();
    this._buffers.clear();
    if (this._context && this._context.state !== 'closed')
      void this._context.close().catch(() => undefined);
    this._context = undefined;
    this._master = undefined;
    this._percussion = undefined;
  }

  private startMusic(mode: 0 | 1 | 2 | 3): void {
    const context = this._context;
    if (!context || !this._master || !this._percussion) return;
    let buffer = this._buffers.get(mode);
    if (!buffer) {
      const stems = synthesizePitfallIIMusic(mode, context.sampleRate);
      // Schedule the background in the same buffer: onended callbacks would leave an audible gap.
      const followup =
        mode === 0 || mode === 2 ? synthesizePitfallIIMusic(1, context.sampleRate) : undefined;
      buffer = context.createBuffer(
        2,
        stems[0].length + (followup?.[0].length ?? 0),
        context.sampleRate,
      );
      for (let channel = 0; channel < 2; channel++) {
        buffer.getChannelData(channel).set(stems[channel]!);
        if (followup)
          buffer.getChannelData(channel).set(followup[channel]!, stems[channel]!.length);
      }
      this._buffers.set(mode, buffer);
    }
    const source = context.createBufferSource();
    const splitter = context.createChannelSplitter(2);
    source.buffer = buffer;
    source.connect(splitter);
    splitter.connect(this._master, 0);
    splitter.connect(this._percussion, 1);
    source.loop = true;
    source.loopStart = mode === 0 || mode === 2 ? PitfallIIMusic.modes[mode].frames / 60 : 0;
    source.loopEnd = buffer.duration;
    source.onended = () => {
      source.disconnect();
      splitter.disconnect();
      if (this._source === source) {
        this._source = undefined;
        this._splitter = undefined;
      }
    };
    this._source = source;
    this._splitter = splitter;
    this._modeEndsAt = mode === 0 || mode === 2 ? context.currentTime + source.loopStart : Infinity;
    source.start();
  }

  private playEffect(kind: IPitfallIISoundEvent['kind'], elapsedFrames: number): void {
    const context = this._context;
    if (context?.state !== 'running' || !this._master || !this._percussion) return;
    const eventTime = context.currentTime - elapsedFrames / 60;
    if (kind === 'jump' && eventTime < this._effectUntil) return;
    const samples = synthesizePitfallIIEffect(kind, context.sampleRate);
    if (samples.length === 0) return;
    this.stopEffect();
    this._effectUntil = eventTime + samples.length / context.sampleRate;
    if (this._effectUntil <= context.currentTime) return;
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this._master);
    source.onended = () => {
      source.disconnect();
      if (this._effect === source) this._effect = undefined;
    };
    this._effect = source;
    // E6 replaces AUDC1/AUDF1/AUDV1 while the percussion sequencer keeps counting underneath.
    this._percussion.gain.cancelScheduledValues(context.currentTime);
    this._percussion.gain.setValueAtTime(0, context.currentTime);
    this._percussion.gain.setValueAtTime(1, this._effectUntil);
    source.start(0, elapsedFrames / 60);
  }

  private stopMusic(): void {
    const source = this._source;
    this._source = undefined;
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this._splitter?.disconnect();
    this._splitter = undefined;
    this._modeEndsAt = Infinity;
  }

  private stopEffect(): void {
    const effect = this._effect;
    this._effect = undefined;
    if (effect) {
      effect.onended = null;
      effect.stop();
      effect.disconnect();
    }
    this._effectUntil = 0;
    if (this._context && this._percussion) {
      this._percussion.gain.cancelScheduledValues(this._context.currentTime);
      this._percussion.gain.setValueAtTime(1, this._context.currentTime);
    }
  }

  // #endregion
}
