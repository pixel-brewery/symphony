// #region Imports

import { describe, expect, it } from 'vitest';
import { SettingsHostSession } from './SettingsHostSession';

// #endregion

describe('SettingsHostSession', () => {
  it('selects global sections and leaves the configured workspace', () => {
    // arrange
    const session = new SettingsHostSession();
    session.openWorkspace('workspace-a', 'administration');

    // act
    session.selectGlobal('appearance');

    // assert
    expect(session.workspaceId()).toBeNull();
    expect(session.globalSection()).toBe('appearance');
  });

  it('clears the search query when a section is opened', () => {
    // arrange
    const session = new SettingsHostSession();
    session.search('token');
    const searching = session.searchQuery();

    // act
    session.openWorkspace('workspace-a');

    // assert
    expect(searching).toBe('token');
    expect(session.searchQuery()).toBe('');
    expect(session.workspaceSection()).toBe('team');
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
