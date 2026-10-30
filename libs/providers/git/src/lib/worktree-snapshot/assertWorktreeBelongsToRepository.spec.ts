// #region Imports

import { describe, expect, it } from 'vitest';
import { assertWorktreeBelongsToRepository } from './assertWorktreeBelongsToRepository';

// #endregion

describe('assertWorktreeBelongsToRepository', () => {
  const identity = { host: 'github.com', owner: 'ruederennes', name: 'flamox' } as const;

  async function check(remote: string): Promise<void> {
    await assertWorktreeBelongsToRepository(
      '/tmp/example',
      identity,
      new AbortController().signal,
      async () => remote,
    );
  }

  it('accepts the HTTPS and SSH remotes of the bound repository', async () => {
    // act
    const httpsResult = check('https://github.com/ruederennes/flamox.git');
    const sshResult = check('git@github.com:ruederennes/flamox.git');
    const caseInsensitiveResult = check('https://github.com/RueDeRennes/Flamox');

    // assert
    await expect(httpsResult).resolves.toBeUndefined();
    await expect(sshResult).resolves.toBeUndefined();
    await expect(caseInsensitiveResult).resolves.toBeUndefined();
  });

  it('rejects a worktree of a different repository', async () => {
    // act
    const actual = check('https://github.com/someone-else/flamox.git');

    // assert
    await expect(actual).rejects.toThrow(/different repository/u);
  });

  it('rejects a directory without an origin remote', async () => {
    // act
    const actual = check('');

    // assert
    await expect(actual).rejects.toThrow(/no origin remote/u);
  });
});
