// #region Imports

import { describe, expect, it } from 'vitest';
import { AgentActivityIconPipe } from './AgentActivityIconPipe';

// #endregion

describe('AgentActivityIconPipe', () => {
  it('gives every state an icon, a colour and the label it stands for', () => {
    // arrange
    const pipe = new AgentActivityIconPipe();
    // act
    const icons = ['completed', 'needs-input', 'failed', 'paused', 'queued'].map((state) =>
      pipe.transform(state),
    );
    // assert
    expect(icons).toEqual([
      { icon: 'checkmarkCircle', variant: 'success', label: 'Finished' },
      { icon: 'warning', variant: 'warning', label: 'Waiting for you' },
      { icon: 'errorCircle', variant: 'danger', label: 'Failed' },
      { icon: 'pause', variant: 'neutral', label: 'Paused' },
      { icon: 'executionOutline', variant: 'neutral', label: 'Queued' },
    ]);
  });
});
