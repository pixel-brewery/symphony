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
    const example = { kind: 'workspace', workspaceId: 'w1', name: 'Example Workspace' } as const;
    // act
    const places = pipe.transform([
      item({ kind: 'mac' }),
      item(example),
      item(example),
      item({ kind: 'workspace', workspaceId: 'w2', name: 'Synapse' }),
    ]);
    // assert
    expect(places).toBe('Example Workspace, Synapse, and this Mac');
    expect(pipe.transform([item(example), item({ kind: 'mac' })])).toBe(
      'Example Workspace and this Mac',
    );
    expect(pipe.transform([])).toBe('');
  });
});
