// #region Imports
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isReadonlyPullRequestWorkflow } from './isReadonlyPullRequestWorkflow.mjs';
import { verificationPolicy } from './verificationPolicy.mjs';
// #endregion

const main = readFileSync(
  new URL('../../../../../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const reviewed = verificationPolicy.reviewedCiSha256;

describe('Explicitly reviewed immutable CI source', () => {
  it('accepts the actual complete read-only Symphony CI only with its fixed trusted review', () => {
    // arrange
    const candidate = main;

    // act
    const accepted = isReadonlyPullRequestWorkflow(main, candidate, reviewed);

    // assert
    expect(accepted).toBe(true);
    expect(reviewed).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('retains a same-owner/path full action pin and version-comment update', () => {
    // arrange
    const candidate = main.replace(
      /(actions\/checkout@)[a-f0-9]{40}(?: # v[^\n]+)?/u,
      '$1' + 'b'.repeat(40) + ' # v8.1.0',
    );
    expect(candidate).not.toBe(main);

    // act
    const accepted = isReadonlyPullRequestWorkflow(main, candidate, reviewed);

    // assert
    expect(accepted).toBe(true);
  });

  it.each([
    ['action owner', (source: string) => source.replace('actions/checkout', 'foreign/checkout')],
    [
      'action path',
      (source: string) => source.replace('actions/checkout', 'actions/checkout/nested'),
    ],
    [
      'mutable action ref',
      (source: string) => source.replace(/actions\/checkout@[a-f0-9]{40}/u, 'actions/checkout@v8'),
    ],
    ['runtime command', (source: string) => source.replace('yarn verify', 'echo skipped')],
    ['token rights', (source: string) => source.replace('contents: read', 'contents: write')],
    [
      'benign future command',
      (source: string) => source.replace('yarn verify', 'yarn verify --future-option'),
    ],
  ] as const)('rejects an unreviewed identical Main/PR change to %s', (_label, change) => {
    // arrange
    const changed = change(main);
    expect(changed).not.toBe(main);

    // act
    const accepted = isReadonlyPullRequestWorkflow(changed, changed, reviewed);

    // assert
    expect(accepted).toBe(false);
  });

  it.each([
    '${{ toJSON(secrets) }}',
    "${{ secrets['PUBLISH_TOKEN'] }}",
    '${{ toJSON(SECRETS) }}',
    "${{ format('}}', secrets.PUBLISH_TOKEN) }}",
    "${{ format('a''}}b', SeCrEtS['PUBLISH_TOKEN']) }}",
    '"${{ se\\u0063rets.PUBLISH_TOKEN }}"',
    '"\\u0024{{ secrets.PUBLISH_TOKEN }}"',
    '"$\\u007b{ secrets.PUBLISH_TOKEN }}"',
    '"${{ se\\' + '\n' + 'crets.PUBLISH_TOKEN }}"',
    '"$\\' + '\n' + '{{ secrets.PUBLISH_TOKEN }}"',
    "'${{ format(''}}'', secrets.PUBLISH_TOKEN) }}'",
  ])('does not learn authority from an encoded or literal source: %s', (expression) => {
    // arrange
    const changed = main.replace('yarn verify', 'echo ' + expression);
    const proposed = changed.replace(
      /(actions\/checkout@)[a-f0-9]{40}(?: # v[^\n]+)?/u,
      '$1' + 'b'.repeat(40) + ' # v8.1.0',
    );

    // act
    const accepted = isReadonlyPullRequestWorkflow(changed, proposed, reviewed);

    // assert
    expect(accepted).toBe(false);
  });

  it.each([undefined, null, '', 'f'.repeat(64), 'A'.repeat(64), 'invalid', 123])(
    'requires the exact well-formed trusted policy value: %s',
    (policy) => {
      // arrange
      const candidate = main;

      // act
      const accepted = isReadonlyPullRequestWorkflow(main, candidate, policy);

      // assert
      expect(accepted).toBe(false);
    },
  );

  it.each([undefined, null, 123, {}, true])(
    'rejects non-source input before normalization: %s',
    (input) => {
      // arrange
      const candidate = main;

      // act
      const accepted = isReadonlyPullRequestWorkflow(input, candidate, reviewed);

      // assert
      expect(accepted).toBe(false);
    },
  );
});
