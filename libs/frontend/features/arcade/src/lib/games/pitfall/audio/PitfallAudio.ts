// #region Imports

import type { IPitfallSnapshot } from '../model/IPitfallSnapshot';
import type { IPitfallSoundEvent } from '../model/IPitfallSoundEvent';
import { createPitfallPolynomialWave } from './createPitfallPolynomialWave';
import { PitfallSoundSequences } from './PitfallSoundSequences';

// #endregion

const AUDIO_CLOCK_HZ = 31399.5;
const FRAME_DURATION = 1 / 60;
const CHANNEL_VOLUME = 4 / 15;

/**
 * Reconstructs Pitfall's two TIA audio channels with browser oscillators.
 * The owning view unlocks audio from a trusted gesture and releases it on destruction.
 *
 * @public
 */
export class PitfallAudio {
  // #region Fields

  private _context: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _melody: OscillatorNode | null = null;
  private _melodyGain: GainNode | null = null;
  private _contact: OscillatorNode | null = null;
  private _contactGain: GainNode | null = null;
  private _poly4: PeriodicWave | null = null;
  private _poly5: PeriodicWave | null = null;
  private _muted = false;
  private _disposed = false;
  private _lastEventId = 0;
  private _lastFrame = 0;
  private _lastDisplayFrame = 0;
  private _soundPhase = 0;
  private _remainingSoundFrames = 0;

  // #endregion

  // #region Methods

  /**
   * Creates or resumes audio after the user starts, resumes or controls the expedition.
   *
   * @returns Completion of the browser's audio-context resume request.
   * @public
   */
  public async resume(): Promise<void> {
    if (this._disposed || typeof AudioContext === 'undefined') return;
    if (!this._context) this.createChannels();
    if (this._context?.state === 'suspended') {
      try {
        await this._context.resume();
      } catch {
        // A revoked browser audio permission must not prevent the game from running.
      }
    }
  }

  /**
   * Consumes each simulation sound event once, including a final treasure fanfare.
   *
   * @param snapshot - The latest simulation frame and its ordered event history.
   * @public
   */
  public update(snapshot: IPitfallSnapshot): void {
    if (this._disposed) return;
    if (snapshot.totalFrames < this._lastFrame || snapshot.displayFrames < this._lastDisplayFrame) {
      this.stopChannels();
      this._soundPhase = 0;
      this._remainingSoundFrames = 0;
    }
    const elapsed = Math.max(0, snapshot.displayFrames - this._lastDisplayFrame);
    const sounding = Math.min(elapsed, this._remainingSoundFrames);
    this._soundPhase = (this._soundPhase + sounding) % 4;
    this._remainingSoundFrames -= sounding;
    this._lastFrame = snapshot.totalFrames;
    this._lastDisplayFrame = snapshot.displayFrames;
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastEventId) continue;
      this._lastEventId = event.id;
      if (this._context?.state !== 'running') continue;
      if (event.kind === 'log' || event.kind === 'wall') this.playContact(event.kind);
      else this.playMelody(event.kind);
    }
  }

  /**
   * Applies the user's sound preference without replaying events when sound is restored.
   *
   * @param muted - Whether the two synthesized channels should be silent.
   * @public
   */
  public setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._context && this._master) {
      this._master.gain.setTargetAtTime(muted ? 0 : 0.16, this._context.currentTime, 0.008);
    }
  }

  /** Freezes scheduled sound when the expedition pauses or loses focus. @public */
  public suspend(): void {
    if (this._context?.state === 'running') void this._context.suspend().catch(() => undefined);
  }

  /** Stops both channels and releases the browser's audio resources. @public */
  public dispose(): void {
    this._disposed = true;
    this._melody?.stop();
    this._contact?.stop();
    this._master?.disconnect();
    if (this._context && this._context.state !== 'closed') {
      void this._context.close().catch(() => undefined);
    }
    this._context = null;
    this._master = null;
    this._melody = null;
    this._contact = null;
    this._melodyGain = null;
    this._contactGain = null;
    this._poly4 = null;
    this._poly5 = null;
  }

  private createChannels(): void {
    const context = new AudioContext();
    this._context = context;
    this._master = context.createGain();
    this._master.gain.value = this._muted ? 0 : 0.16;
    this._master.connect(context.destination);
    this._poly4 = createPitfallPolynomialWave(context, 4);
    this._poly5 = createPitfallPolynomialWave(context, 5);
    this._melody = context.createOscillator();
    this._melody.setPeriodicWave(this._poly4);
    this._melodyGain = context.createGain();
    this._melodyGain.gain.value = 0;
    this._melody.connect(this._melodyGain);
    this._melodyGain.connect(this._master);
    this._melody.start();
    this._contact = context.createOscillator();
    this._contact.setPeriodicWave(this._poly5);
    this._contactGain = context.createGain();
    this._contactGain.gain.value = 0;
    this._contact.connect(this._contactGain);
    this._contactGain.connect(this._master);
    this._contact.start();
  }

  private playMelody(kind: Exclude<IPitfallSoundEvent['kind'], 'log' | 'wall'>): void {
    if (!this._context || !this._melody || !this._melodyGain) return;
    const sequence = PitfallSoundSequences[kind];
    const now = this._context.currentTime;
    this._melody.frequency.cancelScheduledValues(now);
    this._melodyGain.gain.cancelScheduledValues(now);
    this._melodyGain.gain.setValueAtTime(CHANNEL_VOLUME, now);
    let frames = 0;
    for (const [index, note] of sequence.entries()) {
      const duration = (note & 128) !== 0 ? 1 : index === 0 ? 4 - this._soundPhase : 4;
      const frequency = AUDIO_CLOCK_HZ / (15 * ((note & 31) + 1));
      this._melody.frequency.setValueAtTime(frequency, now + frames * FRAME_DURATION);
      frames += duration;
    }
    this._melodyGain.gain.setValueAtTime(0, now + frames * FRAME_DURATION);
    this._remainingSoundFrames = frames;
  }

  private playContact(kind: 'log' | 'wall'): void {
    if (!this._context || !this._contact || !this._contactGain || !this._poly4 || !this._poly5)
      return;
    const now = this._context.currentTime;
    this._contact.setPeriodicWave(kind === 'wall' ? this._poly4 : this._poly5);
    this._contact.frequency.setValueAtTime(
      AUDIO_CLOCK_HZ / ((kind === 'wall' ? 15 : 31) * 17),
      now,
    );
    this._contactGain.gain.cancelScheduledValues(now);
    this._contactGain.gain.setValueAtTime(CHANNEL_VOLUME, now);
    this._contactGain.gain.setValueAtTime(0, now + FRAME_DURATION);
  }

  private stopChannels(): void {
    if (!this._context) return;
    const now = this._context.currentTime;
    for (const gain of [this._melodyGain, this._contactGain]) {
      gain?.gain.cancelScheduledValues(now);
      gain?.gain.setValueAtTime(0, now);
    }
    this._melody?.frequency.cancelScheduledValues(now);
  }

  // #endregion
}
