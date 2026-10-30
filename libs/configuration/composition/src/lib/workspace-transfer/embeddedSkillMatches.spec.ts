// #region Imports

import { describe, expect, it } from 'vitest';
import { embeddedSkillMatches } from './embeddedSkillMatches';
import { WorkspaceTransferTestFixtures } from './WorkspaceTransferTestFixtures';

// #endregion

const { sharedSkill } = WorkspaceTransferTestFixtures;

describe('embeddedSkillMatches', () => {
  it('compares embedded skills by portable content instead of machine metadata', () => {
    // arrange
    const document = sharedSkill();
    const imported = {
      name: document.name,
      description: document.description,
      instructions: document.instructions,
      openaiYaml: document.openaiYaml,
      files: document.files,
    };

    // act
    const actual = embeddedSkillMatches(
      { ...document, digest: 'different-machine-digest' },
      imported,
    );

    // assert
    expect(actual).toBe(true);
    expect(embeddedSkillMatches(document, { ...imported, instructions: 'Changed.' })).toBe(false);
  });
});
