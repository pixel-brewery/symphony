/**
 * Original eight-scanline footer columns transcribed from the Atari 2600 NTSC screenshots.
 * The Activision rainbow is recolored with the application's existing material tones.
 *
 * @public
 */
export const PitfallIIFooterPatterns = {
  activision: [
    [255, 255, 255, 255, 255, 255, 255, 0],
    [255, 255, 255, 255, 255, 255, 255, 0],
    [251, 248, 251, 234, 250, 138, 11, 0],
    [252, 68, 84, 85, 87, 86, 84, 0],
    [63, 96, 206, 168, 46, 34, 46, 0],
    [128, 0, 186, 171, 171, 170, 186, 0],
    [0, 0, 64, 64, 192, 192, 64, 0],
  ],
  copyright: [
    [144, 135, 149, 247, 0, 0, 0, 0],
    [0, 117, 85, 119, 65, 71, 0, 0],
    [0, 107, 74, 75, 0, 3, 0, 0],
    [39, 186, 170, 170, 128, 128, 0, 0],
    [21, 23, 17, 17, 0, 0, 0, 0],
    [81, 115, 81, 119, 0, 0, 0, 0],
  ],
} as const;
