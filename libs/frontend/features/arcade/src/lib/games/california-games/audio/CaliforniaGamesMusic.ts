// #region Imports

import type { CaliforniaGamesMusicCue } from './CaliforniaGamesMusicCue';
import { LynxAudioChannel } from './LynxAudioChannel';

// #endregion

interface ICaliforniaGamesNote {
  readonly midi: number;
  readonly steps: number;
  readonly volume: number;
  readonly waveform?: 'tone' | 'noise';
  readonly integrate?: boolean;
}

interface ICaliforniaGamesProgram {
  readonly bpm: number;
  readonly voices: readonly (readonly ICaliforniaGamesNote[])[];
}

/** Offline 240 Hz sequencer for the reconstructed California Games soundtrack. @public */
export class CaliforniaGamesMusic {
  // #region Methods

  /** Renders a seamless mono loop through four Lynx-style voices without bundled audio samples. @public */
  public static render(cue: CaliforniaGamesMusicCue, sampleRate: number): Float32Array {
    if (cue === 'silent') return new Float32Array(1);
    const program = this.program(cue);
    const ticksPerStep = Math.max(1, Math.round((240 * 60) / program.bpm / 2));
    const totalSteps = Math.max(
      ...program.voices.map((voice) => voice.reduce((sum, note) => sum + note.steps, 0)),
    );
    const totalTicks = totalSteps * ticksPerStep;
    const samples = new Float32Array(Math.ceil((totalTicks * sampleRate) / 240));
    for (let voiceIndex = 0; voiceIndex < 4; voiceIndex++) {
      const voice = program.voices[voiceIndex] ?? [];
      const channel = new LynxAudioChannel(sampleRate);
      let tick = 0;
      for (const note of voice) {
        const noteTicks = note.steps * ticksPerStep;
        for (let noteTick = 0; noteTick < noteTicks; noteTick++) {
          const start = Math.floor((tick * sampleRate) / 240);
          const end = Math.floor(((tick + 1) * sampleRate) / 240);
          channel.sample(
            samples,
            start,
            end - start,
            note.waveform ?? 'tone',
            note.midi === 0 ? 0 : 440 * 2 ** ((note.midi - 69) / 12),
            note.midi === 0 ? 0 : note.volume,
            note.integrate ?? false,
          );
          tick++;
        }
      }
    }
    for (let index = 0; index < samples.length; index++)
      samples[index] = Math.tanh((samples[index] ?? 0) * 1.18) * 0.82;
    return samples;
  }

  private static program(cue: Exclude<CaliforniaGamesMusicCue, 'silent'>): ICaliforniaGamesProgram {
    switch (cue) {
      case 'title':
        return this.titleProgram();
      case 'high-scores':
        return this.highScoreProgram();
      case 'bmx':
        return this.bmxProgram();
      case 'surfing':
        return this.surfingProgram();
      case 'half-pipe':
        return this.halfPipeProgram();
      case 'foot-bag':
        return this.footBagProgram();
    }
  }

  private static titleProgram(): ICaliforniaGamesProgram {
    return {
      bpm: 126,
      voices: [
        this.melody([64, 64, 67, 69, 69, 67, 64, 62, 64, 64, 67, 71, 69, 67, 64, 62], 82),
        this.melody([57, 0, 57, 0, 60, 0, 59, 0, 57, 0, 57, 0, 62, 0, 60, 0], 48),
        this.bass([45, 45, 48, 47, 45, 45, 50, 48]),
        this.drums(32, 72, 96),
      ],
    };
  }

  private static highScoreProgram(): ICaliforniaGamesProgram {
    return {
      bpm: 104,
      voices: [
        this.melody([72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 72, 76, 79, 84], 68),
        this.melody([64, 67, 72, 67, 65, 69, 74, 69, 64, 67, 72, 67, 62, 65, 69, 65], 40),
        this.bass([48, 48, 53, 53, 45, 45, 55, 55]),
        this.drums(32, 48, 72),
      ],
    };
  }

  private static bmxProgram(): ICaliforniaGamesProgram {
    return {
      bpm: 164,
      voices: [
        this.melody([69, 72, 74, 76, 74, 72, 69, 67, 69, 72, 76, 79, 76, 74, 72, 67], 78),
        this.melody([57, 0, 60, 0, 62, 0, 64, 0, 57, 0, 60, 0, 64, 0, 67, 0], 42),
        this.bass([45, 45, 43, 43, 48, 48, 50, 50]),
        this.drums(32, 82, 108),
      ],
    };
  }

  private static surfingProgram(): ICaliforniaGamesProgram {
    return {
      bpm: 152,
      voices: [
        this.melody([76, 76, 74, 72, 69, 72, 74, 69, 79, 79, 76, 74, 72, 74, 76, 72], 80),
        this.melody([64, 0, 62, 0, 60, 0, 57, 0, 67, 0, 64, 0, 62, 0, 60, 0], 44),
        this.bass([40, 40, 45, 45, 43, 43, 47, 47]),
        this.drums(32, 94, 116),
      ],
    };
  }

  private static halfPipeProgram(): ICaliforniaGamesProgram {
    return {
      bpm: 116,
      voices: [
        this.melody([67, 0, 70, 72, 74, 72, 70, 67, 65, 0, 69, 70, 72, 70, 69, 65], 76),
        this.melody([58, 62, 65, 62, 57, 60, 64, 60, 58, 62, 65, 62, 57, 60, 64, 60], 38),
        this.bass([43, 43, 41, 41, 38, 38, 40, 40]),
        this.drums(32, 62, 88),
      ],
    };
  }

  private static footBagProgram(): ICaliforniaGamesProgram {
    return {
      bpm: 140,
      voices: [
        this.melody([71, 74, 76, 0, 74, 71, 69, 0, 71, 74, 78, 0, 76, 74, 71, 69], 78),
        this.melody([62, 0, 64, 66, 0, 64, 62, 0, 62, 0, 66, 69, 0, 66, 64, 62], 42),
        this.bass([47, 47, 45, 45, 50, 50, 43, 45]),
        this.drums(32, 76, 102),
      ],
    };
  }

  private static melody(notes: readonly number[], volume: number): readonly ICaliforniaGamesNote[] {
    return [...notes, ...notes].map((midi) => ({ midi, steps: 1, volume }));
  }

  private static bass(notes: readonly number[]): readonly ICaliforniaGamesNote[] {
    return notes.flatMap((midi) => [
      { midi, steps: 2, volume: 68 },
      { midi: 0, steps: 2, volume: 0 },
    ]);
  }

  private static drums(
    steps: number,
    offbeatVolume: number,
    downbeatVolume: number,
  ): readonly ICaliforniaGamesNote[] {
    return Array.from({ length: steps }, (_, index) => ({
      midi: index % 2 === 0 ? 72 : 84,
      steps: 1,
      volume: index % 4 === 0 ? downbeatVolume : index % 2 === 0 ? offbeatVolume : 34,
      waveform: 'noise' as const,
      integrate: index % 4 === 0,
    }));
  }

  // #endregion
}
