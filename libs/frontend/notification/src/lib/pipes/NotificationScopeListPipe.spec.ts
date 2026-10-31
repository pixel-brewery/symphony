// #region Imports

import { describe, expect, it } from 'vitest';
import type { INotificationItem } from '../models/INotificationItem';
import { NotificationScopeListPipe } from './NotificationScopeListPipe';

// #endregion

function item(scope: INotificationItem['scope']): INotificationItem {
  return { id: 'id', severity: 'warning', title: 'Title', location: [], scope, actions: [] };
}

describe('NotificationScopeListPipe', () => {
  it('names each workspace once and this Mac last', () => {
    // arrange
    const pipe = new NotificationScopeListPipe();
    const flamox = { kind: 'workspace', workspaceId: 'w1', name: 'FLAMOX365' } as const;
    // act
    const places = pipe.transform([
      item({ kind: 'mac' }),
      item(flamox),
      item(flamox),
      item({ kind: 'workspace', workspaceId: 'w2', name: 'Synapse' }),
    ]);
    // assert
    expect(places).toBe('FLAMOX365, Synapse, and this Mac');
    expect(pipe.transform([item(flamox), item({ kind: 'mac' })])).toBe('FLAMOX365 and this Mac');
    expect(pipe.transform([])).toBe('');
  });
});
