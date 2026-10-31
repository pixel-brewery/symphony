// #region Imports

import { describe, expect, it } from 'vitest';
import { createWorkspaceBundle } from './createWorkspaceBundle';
import { workspaceBundleSchema } from './WorkspaceBundleSchema';
import { WorkspaceTransferTestFixtures } from './WorkspaceTransferTestFixtures';

// #endregion

const { configuredWorkspace, fixedDate, sharedSkill } = WorkspaceTransferTestFixtures;

describe('WorkspaceBundleSchema', () => {
  it('rejects a bundle record that crosses the exported workspace boundary', () => {
    // arrange
    const bundle = createWorkspaceBundle(
      configuredWorkspace(),
      'personal',
      [sharedSkill()],
      fixedDate(),
    );

    // act
    const parse = () =>
      workspaceBundleSchema.parse({
        ...bundle,
        connections: [{ ...bundle.connections[0], workspaceId: 'another-workspace' }],
      });

    // assert
    expect(parse).toThrow('does not belong to exported workspace');
  });
});
