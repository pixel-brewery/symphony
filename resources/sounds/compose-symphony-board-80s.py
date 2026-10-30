#!/usr/bin/env python3
"""Compose an original 80s-style instrumental from the current Symphony board."""

from __future__ import annotations

import argparse
import math
import random
import wave
from array import array
from pathlib import Path


SAMPLE_RATE = 32_000
BPM = 116.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT
TOTAL_BARS = 64
TAU = math.tau


def midi_frequency(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


class Mix:
    def __init__(self, duration: float) -> None:
        self.frames = int(duration * SAMPLE_RATE)
        self.left = array("f", [0.0]) * self.frames
        self.right = array("f", [0.0]) * self.frames
        self.random = random.Random(20260822)

    def _pan(self, pan: float) -> tuple[float, float]:
        angle = (pan + 1.0) * math.pi / 4.0
        return math.cos(angle), math.sin(angle)

    def add_tone(
        self,
        start: float,
        duration: float,
        note: float,
        amplitude: float,
        waveform: str,
        pan: float = 0.0,
        attack: float = 0.01,
        release: float = 0.08,
        detune_cents: float = 0.0,
        vibrato: float = 0.0,
    ) -> None:
        first = max(0, int(start * SAMPLE_RATE))
        count = min(int(duration * SAMPLE_RATE), self.frames - first)
        if count <= 0:
            return
        frequency = midi_frequency(note + detune_cents / 100.0)
        phase = 0.0
        phase_step = frequency / SAMPLE_RATE
        left_gain, right_gain = self._pan(pan)
        attack_frames = max(1, int(attack * SAMPLE_RATE))
        release_frames = max(1, int(release * SAMPLE_RATE))
        for offset in range(count):
            if offset < attack_frames:
                envelope = offset / attack_frames
            elif offset >= count - release_frames:
                envelope = max(0.0, (count - offset) / release_frames)
            else:
                envelope = 1.0
            current_phase = phase
            if vibrato:
                current_phase += math.sin(TAU * 5.2 * offset / SAMPLE_RATE) * vibrato
            if waveform == "sine":
                value = math.sin(TAU * current_phase)
            elif waveform == "square":
                value = 1.0 if current_phase < 0.5 else -1.0
            elif waveform == "pulse":
                value = 1.0 if current_phase < 0.28 else -1.0
            else:
                value = 2.0 * current_phase - 1.0
            sample = amplitude * envelope * value
            index = first + offset
            self.left[index] += sample * left_gain
            self.right[index] += sample * right_gain
            phase += phase_step
            if phase >= 1.0:
                phase -= 1.0

    def add_pad(self, bar: int, notes: list[int], amplitude: float) -> None:
        start = bar * BAR
        duration = BAR * 1.08
        for voice, note in enumerate(notes):
            pan = -0.62 + voice * (1.24 / max(1, len(notes) - 1))
            self.add_tone(start, duration, note, amplitude, "saw", pan, 0.28, 0.55, -5.0)
            self.add_tone(start, duration, note + 12, amplitude * 0.42, "sine", -pan, 0.35, 0.65, 6.0, 0.0009)

    def add_bass(self, start: float, duration: float, note: int, amplitude: float) -> None:
        self.add_tone(start, duration, note, amplitude, "square", -0.05, 0.008, 0.11)
        self.add_tone(start, duration, note - 12, amplitude * 0.64, "sine", 0.05, 0.006, 0.12)

    def add_kick(self, start: float, amplitude: float = 0.85) -> None:
        first = int(start * SAMPLE_RATE)
        count = min(int(0.42 * SAMPLE_RATE), self.frames - first)
        phase = 0.0
        for offset in range(max(0, count)):
            t = offset / SAMPLE_RATE
            frequency = 46.0 + 105.0 * math.exp(-t * 22.0)
            phase += frequency / SAMPLE_RATE
            envelope = math.exp(-t * 11.5)
            click = (1.0 - t / 0.012) if t < 0.012 else 0.0
            sample = amplitude * (math.sin(TAU * phase) * envelope + 0.16 * click)
            index = first + offset
            self.left[index] += sample * 0.72
            self.right[index] += sample * 0.72

    def add_snare(self, start: float, amplitude: float = 0.52) -> None:
        first = int(start * SAMPLE_RATE)
        count = min(int(0.56 * SAMPLE_RATE), self.frames - first)
        previous = 0.0
        for offset in range(max(0, count)):
            t = offset / SAMPLE_RATE
            raw = self.random.uniform(-1.0, 1.0)
            high = raw - 0.58 * previous
            previous = raw
            gate = max(0.0, 1.0 - t / 0.38)
            envelope = math.exp(-t * 12.0) + 0.22 * gate
            body = math.sin(TAU * 185.0 * t) * math.exp(-t * 18.0)
            sample = amplitude * (0.78 * high * envelope + 0.28 * body)
            index = first + offset
            self.left[index] += sample * (0.67 + 0.08 * math.sin(TAU * 7.0 * t))
            self.right[index] += sample * (0.67 - 0.08 * math.sin(TAU * 7.0 * t))

    def add_hat(self, start: float, amplitude: float = 0.15, open_hat: bool = False) -> None:
        first = int(start * SAMPLE_RATE)
        length = 0.24 if open_hat else 0.075
        count = min(int(length * SAMPLE_RATE), self.frames - first)
        previous = 0.0
        decay = 18.0 if open_hat else 48.0
        pan = self.random.uniform(-0.38, 0.38)
        left_gain, right_gain = self._pan(pan)
        for offset in range(max(0, count)):
            t = offset / SAMPLE_RATE
            raw = self.random.uniform(-1.0, 1.0)
            high = raw - previous
            previous = raw
            sample = amplitude * high * math.exp(-t * decay)
            index = first + offset
            self.left[index] += sample * left_gain
            self.right[index] += sample * right_gain

    def add_tom(self, start: float, note: float, amplitude: float = 0.38, pan: float = 0.0) -> None:
        self.add_tone(start, 0.34, note, amplitude, "sine", pan, 0.002, 0.25)

    def add_riser(self, start: float, duration: float, amplitude: float = 0.10) -> None:
        first = int(start * SAMPLE_RATE)
        count = min(int(duration * SAMPLE_RATE), self.frames - first)
        previous = 0.0
        for offset in range(max(0, count)):
            progress = offset / max(1, count - 1)
            raw = self.random.uniform(-1.0, 1.0)
            smoothing = 0.94 - 0.72 * progress
            colored = raw - smoothing * previous
            previous = raw
            envelope = progress * progress
            pan_wave = math.sin(TAU * progress * 2.0)
            index = first + offset
            self.left[index] += colored * amplitude * envelope * (0.72 + 0.22 * pan_wave)
            self.right[index] += colored * amplitude * envelope * (0.72 - 0.22 * pan_wave)

    def add_echo(self, delay_seconds: float = 0.145, amount: float = 0.085) -> None:
        delay = int(delay_seconds * SAMPLE_RATE)
        for index in range(delay, self.frames):
            old_left = self.left[index - delay]
            old_right = self.right[index - delay]
            self.left[index] += old_right * amount
            self.right[index] += old_left * amount

    def write_wav(self, output: Path) -> None:
        peak = 0.001
        for index in range(self.frames):
            peak = max(peak, abs(self.left[index]), abs(self.right[index]))
        gain = min(1.7, 0.93 / peak)
        with wave.open(str(output), "wb") as target:
            target.setnchannels(2)
            target.setsampwidth(2)
            target.setframerate(SAMPLE_RATE)
            chunk_size = 8192
            for chunk_start in range(0, self.frames, chunk_size):
                chunk_end = min(self.frames, chunk_start + chunk_size)
                pcm = array("h")
                for index in range(chunk_start, chunk_end):
                    for value in (self.left[index], self.right[index]):
                        scaled = value * gain
                        # Smooth analog-console-style saturation before PCM conversion.
                        saturated = scaled / (1.0 + 0.28 * abs(scaled))
                        pcm.append(max(-32767, min(32767, int(saturated * 32767.0))))
                target.writeframes(pcm.tobytes())


CHORDS = {
    "Em": ([52, 55, 59, 64], 40),
    "C": ([48, 52, 55, 60], 36),
    "G": ([50, 55, 59, 62], 43),
    "D": ([50, 54, 57, 62], 38),
    "Am": ([45, 48, 52, 57], 33),
    "B7": ([47, 51, 54, 57], 35),
}


def progression_for_bar(bar: int) -> str:
    if bar < 8:  # Backlog: 53 items, the first dense weight.
        return ["Em", "C", "G", "D"][bar % 4]
    if bar < 12:  # Qualified: only 2 items, a short narrow gate.
        return ["Am", "C", "D", "B7"][bar - 8]
    if bar < 28:  # Ready: 78 items, the longest and busiest build.
        return ["Em", "C", "G", "D"][bar % 4]
    if bar < 36:  # Progress: 8 items, first full melodic statement.
        return ["C", "G", "D", "Em"][bar % 4]
    if bar < 44:  # Acceptance: 8 items, suspended half-time bridge.
        return ["Am", "Em", "C", "D"][bar % 4]
    if bar < 60:  # Done: 52 items, relative-major resolution.
        return ["G", "D", "Em", "C"][bar % 4]
    return ["G", "D", "C", "G"][bar - 60]


def add_harmony(mix: Mix) -> None:
    for bar in range(TOTAL_BARS):
        chord_name = progression_for_bar(bar)
        notes, root = CHORDS[chord_name]
        if bar < 4:
            pad_amp = 0.024
        elif 8 <= bar < 12:
            pad_amp = 0.032
        elif 36 <= bar < 40:
            pad_amp = 0.038
        elif bar >= 44:
            pad_amp = 0.047
        else:
            pad_amp = 0.040
        mix.add_pad(bar, notes, pad_amp)

        if 4 <= bar < 8 or 12 <= bar < 60:
            if 36 <= bar < 40:
                bass_beats = [0.0, 2.0]
            else:
                bass_beats = [0.0, 1.5, 2.0, 3.0]
            for beat_index, beat_position in enumerate(bass_beats):
                octave = 12 if beat_index == len(bass_beats) - 1 and bar >= 28 else 0
                mix.add_bass(bar * BAR + beat_position * BEAT, BEAT * 0.62, root + octave, 0.105)

        # Sequenced sixteenth-note arpeggio: the board's constant throughput.
        if bar < 36 or 40 <= bar < 60:
            arp_notes = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[-1] + 12]
            density = 8 if bar < 12 else 16
            for step in range(density):
                subdivision = 4.0 / density
                start = bar * BAR + step * subdivision * BEAT
                note = arp_notes[step % len(arp_notes)]
                pan = -0.48 if step % 2 == 0 else 0.48
                mix.add_tone(start, BEAT * subdivision * 0.68, note, 0.030, "pulse", pan, 0.003, 0.045)


def add_drums(mix: Mix) -> None:
    for bar in range(TOTAL_BARS):
        bar_start = bar * BAR
        if bar < 4:
            continue
        if 8 <= bar < 12:
            # Two qualified items become two deliberate pulses per bar.
            mix.add_kick(bar_start, 0.55)
            mix.add_tom(bar_start + 2.5 * BEAT, 43 + (bar - 8), 0.28, -0.35 + 0.22 * (bar - 8))
            continue
        half_time = 36 <= bar < 40
        outro = bar >= 60
        kick_beats = [0.0, 2.0] if half_time or outro else [0.0, 1.5, 2.0, 3.25]
        for beat_position in kick_beats:
            mix.add_kick(bar_start + beat_position * BEAT, 0.72 if bar < 28 else 0.82)
        snare_beats = [2.0] if half_time else [1.0, 3.0]
        for beat_position in snare_beats:
            mix.add_snare(bar_start + beat_position * BEAT, 0.43 if outro else 0.50)
        hat_steps = 4 if outro else (8 if bar < 28 or half_time else 16)
        for step in range(hat_steps):
            position = 4.0 * step / hat_steps
            open_hat = not outro and step == hat_steps - 1 and bar % 2 == 1
            mix.add_hat(bar_start + position * BEAT, 0.09 if step % 2 == 0 else 0.07, open_hat)
        if bar in (27, 35, 43, 59):
            for step, note in enumerate((48, 46, 43, 40)):
                mix.add_tom(bar_start + (3.0 + step * 0.25) * BEAT, note, 0.32, -0.6 + step * 0.4)


def add_melody_phrase(mix: Mix, bar: int, phrase: list[tuple[float, float, int]], amplitude: float) -> None:
    for beat_position, duration_beats, note in phrase:
        start = bar * BAR + beat_position * BEAT
        duration = duration_beats * BEAT
        mix.add_tone(start, duration, note, amplitude, "square", -0.10, 0.018, 0.16, -3.0, 0.0013)
        mix.add_tone(start + 0.012, duration, note + 12, amplitude * 0.26, "sine", 0.24, 0.025, 0.18, 4.0, 0.0015)


def add_lead(mix: Mix) -> None:
    progress_phrases = [
        [(0.0, 0.75, 76), (1.0, 0.5, 79), (1.75, 0.75, 83), (3.0, 0.85, 81)],
        [(0.0, 0.5, 79), (0.75, 0.5, 81), (1.5, 1.0, 83), (3.0, 0.9, 79)],
        [(0.0, 0.75, 78), (1.0, 0.75, 81), (2.0, 0.5, 85), (2.75, 1.0, 83)],
        [(0.0, 0.5, 76), (0.75, 0.5, 79), (1.5, 0.75, 83), (2.5, 1.35, 88)],
    ]
    for offset in range(8):
        add_melody_phrase(mix, 28 + offset, progress_phrases[offset % 4], 0.073)

    acceptance_phrases = [
        [(0.0, 1.5, 76), (2.0, 0.75, 74), (3.0, 0.8, 72)],
        [(0.0, 0.75, 71), (1.0, 0.75, 74), (2.0, 1.7, 76)],
        [(0.0, 1.0, 72), (1.5, 0.5, 76), (2.25, 1.5, 79)],
        [(0.0, 0.5, 78), (0.75, 0.5, 81), (1.5, 0.75, 83), (2.5, 1.3, 86)],
    ]
    for offset in range(8):
        add_melody_phrase(mix, 36 + offset, acceptance_phrases[offset % 4], 0.064 + 0.003 * offset)

    done_phrases = [
        [(0.0, 0.75, 79), (1.0, 0.5, 83), (1.75, 0.75, 86), (3.0, 0.85, 83)],
        [(0.0, 0.5, 81), (0.75, 0.5, 78), (1.5, 1.0, 81), (3.0, 0.9, 86)],
        [(0.0, 0.75, 83), (1.0, 0.75, 79), (2.0, 0.5, 76), (2.75, 1.0, 79)],
        [(0.0, 0.5, 79), (0.75, 0.5, 81), (1.5, 0.75, 83), (2.5, 1.35, 86)],
    ]
    for offset in range(16):
        amplitude = 0.084 if offset < 8 else 0.096
        add_melody_phrase(mix, 44 + offset, done_phrases[offset % 4], amplitude)
        if offset >= 8:
            # Octave answer: the 52 completed items get the widest sound.
            for beat_position, duration_beats, note in done_phrases[offset % 4][::2]:
                mix.add_tone(
                    (44 + offset) * BAR + (beat_position + 0.25) * BEAT,
                    duration_beats * BEAT * 0.72,
                    note - 12,
                    0.034,
                    "saw",
                    0.52,
                    0.01,
                    0.12,
                )


def compose(output: Path) -> None:
    duration = TOTAL_BARS * BAR + 1.8
    mix = Mix(duration)
    add_harmony(mix)
    add_drums(mix)
    add_lead(mix)
    # Transitions correspond to Qualified→Ready, Ready→Progress, and Acceptance→Done.
    mix.add_riser(10 * BAR, 2 * BAR, 0.08)
    mix.add_riser(26 * BAR, 2 * BAR, 0.09)
    mix.add_riser(42 * BAR, 2 * BAR, 0.12)
    mix.add_echo()
    output.parent.mkdir(parents=True, exist_ok=True)
    mix.write_wav(output)
    print(f"Rendered {duration:.1f}s to {output}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    compose(args.output.expanduser().resolve())


if __name__ == "__main__":
    main()
