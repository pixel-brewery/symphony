// #region Imports

import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createWorkspaceBundle,
  workspaceBundleFileName,
  workspaceBundleSchema,
} from '@symphony/configuration-composition';
import { JsonWorkspaceBundleRepository } from './JsonWorkspaceBundleRepository';
import { WorkspaceTransferTestFixtures } from '@symphony/configuration-composition/testing';

// #endregion

const { configuredWorkspace, fixedDate, sharedSkill } = WorkspaceTransferTestFixtures;

describe('JsonWorkspaceBundleRepository', () => {
  it('writes a private versioned JSON bundle and reads it back', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-workspace-transfer-'));
    const repository = new JsonWorkspaceBundleRepository();
    const bundle = createWorkspaceBundle(
      configuredWorkspace(),
      'personal',
      [sharedSkill()],
      fixedDate(),
    );
    const fileName = workspaceBundleFileName(bundle.workspace, fixedDate());

    // act
    const path = repository.write(directory, fileName, bundle);

    // assert
    expect(path).toBe(join(directory, 'personal-20260813T101112Z.symphony-workspace.json'));
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(workspaceBundleSchema.parse(repository.read(path))).toEqual(bundle);
    expect(readFileSync(path, 'utf8')).toContain('"format": "symphony.workspace"');
    expect(() => repository.write(directory, fileName, bundle)).toThrow('already exists');
  });
});
