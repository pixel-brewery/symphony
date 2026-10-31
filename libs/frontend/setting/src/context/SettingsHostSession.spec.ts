// #region Imports

import { describe, expect, it } from 'vitest';
import { SettingsHostSession } from './SettingsHostSession';

// #endregion

describe('SettingsHostSession', () => {
  it('retains directory expansion semantics across workspace and global navigation', () => {
    // arrange
    const session = new SettingsHostSession();
    session.openWorkspace('workspace-a', 'administration');

    // act
    session.selectGlobal('workspaces');
    const afterWorkspace = session.workspaceNavigationExpanded();
    session.selectGlobal('workspaces');
    const afterToggle = session.workspaceNavigationExpanded();
    session.selectGlobal('appearance');

    // assert
    expect(afterWorkspace).toBe(true);
    expect(afterToggle).toBe(false);
    expect(session.workspaceId()).toBeNull();
    expect(session.globalSection()).toBe('appearance');
    expect(session.workspaceNavigationExpanded()).toBe(false);
  });

  it('opens a newly persisted workspace and clears a deleted selection without selecting existing workspaces initially', () => {
    // arrange
    const session = new SettingsHostSession();
    session.reconcileWorkspaces(['workspace-a']);
    expect(session.workspaceId()).toBeNull();

    // act
    session.reconcileWorkspaces(['workspace-a', 'workspace-b']);
    const selectedAdded = session.workspaceId();
    session.reconcileWorkspaces(['workspace-a']);

    // assert
    expect(selectedAdded).toBe('workspace-b');
    expect(session.workspaceId()).toBeNull();
  });

  it('falls back to included sections when optional features are omitted', () => {
    // arrange
    const session = new SettingsHostSession();
    session.openWorkspace('workspace-a', 'team');

    // act
    session.reconcileSections(['system', 'appearance'], ['administration']);

    // assert
    expect(session.globalSection()).toBe('system');
    expect(session.workspaceSection()).toBe('administration');
    expect(session.workspaceId()).toBe('workspace-a');
  });
});
