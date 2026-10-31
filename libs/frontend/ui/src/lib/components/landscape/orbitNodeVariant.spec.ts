// #region Imports

import { describe, expect, it } from 'vitest';
import type { IOrbitNode } from './IOrbitNode';
import { orbitNodeVariant } from './orbitNodeVariant';

// #endregion

describe('orbitNodeVariant', () => {
  it('gives the same workflow and delivery facts one semantic colour in the GPU and DOM', () => {
    // arrange
    const node: IOrbitNode = {
      id: 'ticket:a',
      kind: 'ticket',
      label: 'A',
      position: { x: 0, y: 0, z: 0 },
    };
    // act
    const automated = orbitNodeVariant({ ...node, stageKind: 'automated' });
    const terminal = orbitNodeVariant({ ...node, stageKind: 'terminal' });
    const human = orbitNodeVariant({ ...node, stageKind: 'human-gate' });
    const failure = orbitNodeVariant({ ...node, deliveryState: 'failed' });
    // assert
    expect(automated).toBe('warning');
    expect(terminal).toBe('success');
    expect(human).toBe('highlight');
    expect(failure).toBe('danger');
    expect(orbitNodeVariant({ ...node, kind: 'target', deliveryState: 'unconfirmed' })).toBe(
      'secondary',
    );
  });

  it('lets the cluster tone of a ticket or cluster label win over its work stage', () => {
    // arrange
    const node: IOrbitNode = {
      id: 'ticket:a',
      kind: 'ticket',
      label: 'A',
      stageKind: 'automated',
      position: { x: 0, y: 0, z: 0 },
    };
    // act
    const attention = orbitNodeVariant({ ...node, tone: 'danger' });
    const neutral = orbitNodeVariant({ ...node, tone: 'neutral' });
    const done = orbitNodeVariant({ ...node, kind: 'group', tone: 'success' });
    // assert
    expect(attention).toBe('danger');
    expect(neutral).toBe('neutral');
    expect(done).toBe('success');
  });
});
