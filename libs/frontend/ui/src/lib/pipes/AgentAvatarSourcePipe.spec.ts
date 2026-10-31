// #region Imports

import { describe, expect, it } from 'vitest';
import { defaultAgentAppearance, type IAgentAppearance } from '@symphony/domain-team';
import { agentFigureSource } from '../components/agent-figure/agentFigureSource';
import { AgentAvatarSourcePipe } from './AgentAvatarSourcePipe';

// #endregion

describe('AgentAvatarSourcePipe', () => {
  it.each([
    ['blue', 'blue'],
    ['mint', 'mint'],
    ['coral', 'orange'],
    ['violet', 'purple'],
    ['gold', 'gold'],
    ['rose', 'rose'],
  ] as const)('preserves the saved %s identity in the compact avatar', (color, character) => {
    // arrange
    const appearance: IAgentAppearance = { figure: 'dot', color, accessories: [] };
    const pipe = new AgentAvatarSourcePipe();

    // act
    const source = pipe.transform('employee', appearance);

    // assert
    expect(source).toBe(`figures/${character}-48.png`);
    expect(agentFigureSource(appearance)).toBe(`figures/${character}.png`);
  });

  it('uses the established ID default when an older profile has no appearance', () => {
    // arrange
    const pipe = new AgentAvatarSourcePipe();
    const agentId = 'existing-employee';

    // act
    const source = pipe.transform(agentId);

    // assert
    expect(source).toBe(agentFigureSource(defaultAgentAppearance(agentId), 'avatar'));
    expect(pipe.transform(agentId)).toBe(source);
  });

  it('keeps an existing legacy image reference readable', () => {
    // arrange
    const appearance: IAgentAppearance = {
      figure: 'dot',
      color: 'blue',
      accessories: [],
      image: 'data:image/png;base64,legacy-image',
    };

    // act
    const source = new AgentAvatarSourcePipe().transform('legacy-employee', appearance);

    // assert
    expect(source).toBe(appearance.image);
  });
});
