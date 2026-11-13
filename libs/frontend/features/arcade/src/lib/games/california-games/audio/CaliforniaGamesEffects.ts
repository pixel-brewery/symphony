// #region Imports

import type { ICaliforniaGamesSoundEvent } from './ICaliforniaGamesSoundEvent';
import { LynxAudioChannel } from './LynxAudioChannel';

// #endregion

interface ICaliforniaGamesEffectFrame {
  readonly frequency: number;
  readonly volume: number;
  readonly waveform: 'tone' | 'noise';
  readonly integrate?: boolean;
}

/** Four-voice Lynx-style synthesis for California Games menu and event cues. @public */
export class CaliforniaGamesEffects {
  // #region Methods

  /** Renders one short mono effect at the Lynx sequencer's 240 Hz update cadence. @public */
  public static render(kind: ICaliforniaGamesSoundEvent['kind'], sampleRate: number): Float32Array {
    const frames = this.frames(kind);
    const length = Math.ceil((frames.length * sampleRate) / 240);
    const samples = new Float32Array(length);
    const channels = Array.from({ length: 4 }, () => new LynxAudioChannel(sampleRate));
    for (let frame = 0; frame < frames.length; frame++) {
      const voice = frames[frame]!;
      const start = Math.floor((frame * sampleRate) / 240);
      const end = Math.floor(((frame + 1) * sampleRate) / 240);
      channels[frame % channels.length]!.sample(
        samples,
        start,
        end - start,
        voice.waveform,
        voice.frequency,
        voice.volume,
        voice.integrate ?? false,
      );
    }
    for (let index = 0; index < samples.length; index++)
      samples[index] = Math.tanh((samples[index] ?? 0) * 1.65) * 0.88;
    return samples;
  }

  private static frames(
    kind: ICaliforniaGamesSoundEvent['kind'],
  ): readonly ICaliforniaGamesEffectFrame[] {
    switch (kind) {
      case 'menu-move':
        return this.sweep(6, 330, 520, 70, 'tone');
      case 'menu-select':
        return [...this.sweep(12, 330, 660, 90, 'tone'), ...this.sweep(8, 660, 880, 72, 'tone')];
      case 'countdown':
        return this.sweep(24, 520, 520, 88, 'tone');
      case 'jump':
        return this.sweep(22, 180, 620, 92, 'tone');
      case 'land':
        return this.sweep(18, 220, 86, 90, 'noise');
      case 'crash':
        return this.sweep(62, 760, 48, 110, 'noise', true);
      case 'score':
        return [...this.sweep(10, 660, 880, 84, 'tone'), ...this.sweep(10, 880, 1100, 72, 'tone')];
      case 'wipeout':
        return this.sweep(70, 940, 60, 108, 'noise', true);
      case 'kick':
        return this.sweep(14, 300, 760, 82, 'tone');
      case 'fall':
        return this.sweep(42, 440, 68, 100, 'noise');
      case 'time-warning':
        return this.sweep(30, 980, 980, 96, 'tone');
      case 'high-score':
        return [
          ...this.sweep(16, 520, 780, 88, 'tone'),
          ...this.sweep(16, 660, 1040, 88, 'tone'),
          ...this.sweep(28, 1040, 1040, 76, 'tone'),
        ];
      case 'finish':
        return [
          ...this.sweep(14, 440, 660, 92, 'tone'),
          ...this.sweep(14, 660, 880, 92, 'tone'),
          ...this.sweep(36, 880, 880, 80, 'tone'),
        ];
    }
  }

  private static sweep(
    length: number,
    from: number,
    to: number,
    volume: number,
    waveform: 'tone' | 'noise',
    integrate = false,
  ): readonly ICaliforniaGamesEffectFrame[] {
    return Array.from({ length }, (_, index) => {
      const progress = length <= 1 ? 0 : index / (length - 1);
      return {
        frequency: from + (to - from) * progress,
        volume: Math.round(volume * (1 - progress * 0.72)),
        waveform,
        integrate,
      };
    });
  }

  // #endregion
}
