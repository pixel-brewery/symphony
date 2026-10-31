// #region Imports

import { describe, expect, it } from 'vitest';
import { skillRequestSchemas } from './SkillRequestSchemas';

// #endregion

describe('SkillRequestSchemas', () => {
  it('accepts editable package content without changing resource data', () => {
    // arrange
    const request = {
      skill: {
        originalName: 'previous-analysis',
        name: 'analysis',
        description: 'Read repository evidence before implementation.',
        instructions: '# Analysis\nRead the repository.',
        openaiYaml: 'policy:\n  allow_implicit_invocation: false\n',
        files: [
          {
            path: 'references/context.md',
            kind: 'reference',
            encoding: 'utf8',
            content: 'Repository context',
            size: 18,
          },
        ],
      },
    };

    // act
    const actual = skillRequestSchemas['skills.save'].parse(request);

    // assert
    expect(actual).toEqual(request);
  });

  it.each([
    { label: 'name', override: { name: 'x'.repeat(65) } },
    { label: 'description', override: { description: 'x'.repeat(2_001) } },
    { label: 'instructions', override: { instructions: 'x'.repeat(500_001) } },
    { label: 'OpenAI metadata', override: { openaiYaml: 'x'.repeat(100_001) } },
    {
      label: 'resource count',
      override: {
        files: Array.from({ length: 251 }, () => ({
          path: 'references/context.md',
          kind: 'reference',
          encoding: 'utf8',
          content: '',
          size: 0,
        })),
      },
    },
  ])('rejects $label outside the established IPC budget', ({ override }) => {
    // arrange
    const request = {
      skill: {
        name: 'analysis',
        description: 'Analyze repository evidence.',
        instructions: 'Inspect the repository.',
        openaiYaml: '',
        files: [],
        ...override,
      },
    };

    // act
    const actual = skillRequestSchemas['skills.save'].safeParse(request);

    // assert
    expect(actual.success).toBe(false);
  });

  it('customizes a built-in process role while preserving empty instructions', () => {
    // arrange
    const request = { role: 'analyze', additionalInstructions: '' };

    // act
    const actual = skillRequestSchemas['skills.builtin.customize'].parse(request);

    // assert
    expect(actual).toEqual(request);
  });

  it.each([
    { label: 'flow-role alias', request: { role: 'analysis', additionalInstructions: '' } },
    {
      label: 'oversized instructions',
      request: { role: 'analyze', additionalInstructions: 'x'.repeat(20_001) },
    },
  ])('rejects built-in customization with $label', ({ request }) => {
    // act
    const actual = skillRequestSchemas['skills.builtin.customize'].safeParse(request);

    // assert
    expect(actual.success).toBe(false);
  });

  it('requires both the skill identity and selected export destination', () => {
    // arrange
    const request = { id: 'user:analysis' };

    // act
    const actual = skillRequestSchemas['skills.export'].safeParse(request);

    // assert
    expect(actual.success).toBe(false);
  });
});
