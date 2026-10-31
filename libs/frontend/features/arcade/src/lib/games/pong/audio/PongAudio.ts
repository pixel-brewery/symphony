// #region Imports

import type { IPongSnapshot } from '../model/IPongSnapshot';
import { PongRules } from '../model/PongRules';
import { synthesizePongSound } from './synthesizePongSound';

// #endregion

/** Gesture-unlocked cabinet sound with the shared Arcade pause, mute and route-exit lifecycle. @public */
export class PongAudio {
  // #region Fields

  private _context: AudioContext | undefined;
  private _master: GainNode | undefined;
  private readonly _sources = new Set<AudioBufferSourceNode>();
  private _muted = false;
  private _disposed = false;
  private _generation = -1;
  private _lastEvent = 0;

  // #endregion

  // #region Methods

  /** Opens audio only after a player starts, resumes or touches the controls. @public */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    if (!this._context) {
      this._context = new AudioContext();
      this._master = this._context.createGain();
      this._master.gain.value = this._muted ? 0 : 0.7;
      this._master.connect(this._context.destination);
    }
    if (this._context.state === 'suspended') {
      try {
        await this._context.resume();
      } catch {
        /* Audio permissions do not prevent play. */
      }
    }
  }

  /** Consumes cabinet sound gates once and preserves their age across batched simulation steps. @public */
  public update(snapshot: IPongSnapshot): void {
    if (this._disposed) return;
    if (snapshot.generation !== this._generation) {
      this.reset();
      this._generation = snapshot.generation;
    }
    if (snapshot.status === 'gameOver' || snapshot.status === 'attract') this.reset();
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastEvent) continue;
      this._lastEvent = event.id;
      const context = this._context;
      if (
        context?.state !== 'running' ||
        !this._master ||
        snapshot.status === 'attract' ||
        snapshot.status === 'gameOver'
      )
        continue;
      const samples = synthesizePongSound(event, context.sampleRate);
      const age =
        (Math.max(0, snapshot.frame - event.frame) * PongRules.lineClocks * PongRules.frameLines) /
        PongRules.clock;
      if (age >= samples.length / context.sampleRate) continue;
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(this._master);
      source.onended = () => {
        source.disconnect();
        this._sources.delete(source);
      };
      this._sources.add(source);
      source.start(0, age);
    }
  }

  /** Silences playback without retaining old effects for later replay. @public */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._context && this._master)
      this._master.gain.setTargetAtTime(muted ? 0 : 0.7, this._context.currentTime, 0.008);
  }

  /** Freezes scheduled gates during menus, pause and loss of focus. @public */
  public suspend(): void {
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Clears a previous coin's effects immediately when a new match begins. @public */
  public reset(): void {
    for (const source of this._sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this._sources.clear();
  }

  /** Releases all browser audio resources once when the game route closes. @public */
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

  // #endregion
}
