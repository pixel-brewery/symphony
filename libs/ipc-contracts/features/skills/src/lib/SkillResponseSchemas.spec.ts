// #region Imports

import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { describe, expect, it } from 'vitest';
import { skillResponseSchemas } from './SkillResponseSchemas';

// #endregion

describe('SkillResponseSchemas', () => {
  it('returns bounded package content and strips unknown transport fields', () => {
    // arrange
    const document = {
      id: 'user:analysis',
      name: 'analysis',
      displayName: 'Analysis',
      description: 'Read repository evidence.',
      source: 'user',
      location: '/test/skills/analysis',
      editable: true,
      implicitInvocation: false,
      updatedAt: '2026-10-30T08:00:00.000Z',
      digest: 'skill-digest',
      resourceCount: 1,
      warnings: [],
      instructions: '# Analysis\nRead the repository.',
      openaiYaml: '',
      files: [
        {
          path: 'references/context.md',
          kind: 'reference',
          encoding: 'utf8',
          content: 'Repository context',
          size: 18,
        },
      ],
    };

    // act
    const actual = skillResponseSchemas['skills.get'].parse({
      ...document,
      providerCredential: 'discarded-provider-value',
    });

    // assert
    expect(actual).toEqual(document);
    expect(actual).not.toHaveProperty('providerCredential');
  });

  it('keeps built-in process roles and their execution capabilities in the response', () => {
    // arrange
    const response = {
      skills: [
        {
          role: 'analyze',
          displayName: 'Analyzer',
          description: 'Analyze repository evidence.',
          version: '1.0.0',
          promptVersion: 1,
          instructions: 'Inspect the repository.',
          mutatesWorkspace: false,
          publishesPullRequest: false,
          additionalInstructions: '',
        },
      ],
    };

    // act
    const actual = skillResponseSchemas['skills.builtin.list'].parse(response);

    // assert
    expect(actual).toEqual(response);
  });

  it('retains the complete version-six settings response after built-in customization', () => {
    // arrange
    const settings = createDefaultApplicationSettings('/test/skills-contract');

    // act
    const actual = skillResponseSchemas['skills.builtin.customize'].parse(settings);

    // assert
    expect(actual).toEqual(settings);
    expect(actual.version).toBe(6);
    expect(actual.activeViewScope.workspaceIds).toEqual(['personal']);
  });

  it('rejects partial settings as a successful built-in customization response', () => {
    // arrange
    const partialSettings = { role: 'analyze', additionalInstructions: 'Inspect tests.' };

    // act
    const actual = skillResponseSchemas['skills.builtin.customize'].safeParse(partialSettings);

    // assert
    expect(actual.success).toBe(false);
  });

  it('preserves an optional exported path without exposing unknown result fields', () => {
    // arrange
    const response = {
      message: 'Skill exported.',
      path: '/test/exports/analysis',
      providerCredential: 'discarded-provider-value',
    };

    // act
    const actual = skillResponseSchemas['skills.export'].parse(response);

    // assert
    expect(actual).toEqual({ message: 'Skill exported.', path: '/test/exports/analysis' });
  });
});
