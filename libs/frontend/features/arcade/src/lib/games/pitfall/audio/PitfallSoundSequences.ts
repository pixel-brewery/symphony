/**
 * Original AUDF divider sequences; bit seven marks the one-frame final note.
 * Entry points correspond to the disassembly's SoundTab offsets 1, 32, 37, 49 and 83.
 *
 * @public
 */
export const PitfallSoundSequences = {
  swing: [
    19, 19, 19, 19, 19, 19, 19, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 9, 11, 9, 11, 11,
    11, 11, 11, 11, 11, 139,
  ],
  jump: [6, 4, 3, 2, 132],
  treasure: [19, 19, 14, 11, 9, 9, 9, 11, 9, 9, 9, 137],
  death: [
    29, 29, 29, 29, 29, 29, 29, 29, 29, 26, 26, 25, 25, 25, 25, 25, 25, 29, 29, 29, 29, 29, 20, 21,
    20, 21, 20, 21, 20, 21, 20, 21, 20, 149,
  ],
  fall: [24, 25, 26, 27, 28, 29, 30, 159],
} as const;
