/** Original counter geometry and timing, plus explicit browser paddle calibration. @public */
export const PongRules = {
  clock: 315_000_000 / 44,
  lineClocks: 455,
  frameLines: 262,
  width: 374,
  height: 246,
  netX: 175,
  paddleX: [47, 303] as const,
  paddleWidth: 4,
  paddleHeight: 15,
  paddleTopGap: 8,
  keyboardPixelsPerFrame: 4,
  ballSize: 4,
  serveX: 181,
  serveSeconds: 1.1 * 330_000 * 4.7e-6,
} as const;
