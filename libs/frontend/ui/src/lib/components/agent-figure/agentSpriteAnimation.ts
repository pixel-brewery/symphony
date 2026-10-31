// #region Imports

import type { AgentSpriteState } from './AgentSpriteState';
import type { IAgentSpriteAnimation } from './IAgentSpriteAnimation';
import type { IAgentSpriteFrame } from './IAgentSpriteFrame';

// #endregion

const idleFrames: readonly IAgentSpriteFrame[] = [280, 110, 110, 140, 140, 320].map(
  (duration, columnIndex) => ({ rowIndex: 0, columnIndex, frameDurationMs: duration * 6 }),
);
const row = (
  rowIndex: number,
  count: number,
  duration: number,
  finalDuration: number,
): readonly IAgentSpriteFrame[] =>
  Array.from({ length: count }, (_, columnIndex) => ({
    rowIndex,
    columnIndex,
    frameDurationMs: columnIndex === count - 1 ? finalDuration : duration,
  }));
const framesByState: Record<AgentSpriteState, readonly IAgentSpriteFrame[]> = {
  idle: idleFrames,
  'running-right': row(1, 8, 120, 220),
  'running-left': row(2, 8, 120, 220),
  waving: row(3, 4, 140, 280),
  jumping: row(4, 5, 140, 280),
  failed: row(5, 8, 140, 240),
  waiting: row(6, 6, 150, 260),
  running: row(7, 6, 120, 220),
  review: row(8, 6, 150, 280),
};

/** Adapts FLAMOX's timing: real work loops until its status changes; gestures finish. @public */
export function agentSpriteAnimation(
  state: AgentSpriteState,
  reducedMotion: boolean,
  stationary: boolean,
): IAgentSpriteAnimation {
  const frames = framesByState[state];
  if (reducedMotion || stationary) return { frames: [frames[0]!], loopStartIndex: null };
  if (state === 'jumping' || state === 'waving') {
    const action = [...frames, ...frames, ...frames];
    return { frames: [...action, ...idleFrames], loopStartIndex: action.length };
  }
  return { frames, loopStartIndex: 0 };
}
