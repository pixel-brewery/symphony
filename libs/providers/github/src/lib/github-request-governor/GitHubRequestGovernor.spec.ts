// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { GitHubRateLimitError } from './GitHubRateLimitError';
import { GitHubRequestGovernor } from './GitHubRequestGovernor';

// #endregion

describe('GitHubRequestGovernor', () => {
  it('bounds request concurrency without dropping queued work', async () => {
    // arrange
    const governor = new GitHubRequestGovernor(2);
    const releases: (() => void)[] = [];
    let active = 0;
    let maximumActive = 0;
    const execute = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          releases.push(() => {
            active -= 1;
            resolve(releases.length);
          });
        }),
    );

    const operations = [
      governor.run(execute),
      governor.run(execute),
      governor.run(execute),
      governor.run(execute),
    ];
    // act
    await Promise.resolve();

    // assert
    expect(execute).toHaveBeenCalledTimes(2);
    expect(maximumActive).toBe(2);

    releases.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(3);

    while (releases.length) {
      releases.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }
    await expect(Promise.all(operations)).resolves.toHaveLength(4);
    expect(execute).toHaveBeenCalledTimes(4);
  });

  it('fails fast until GitHub reports that its exhausted budget has reset', async () => {
    // arrange
    const governor = new GitHubRequestGovernor();
    const execute = vi.fn(async () => 'unexpected');
    const resetAt = new Date(Date.now() + 60_000).toISOString();

    // act
    governor.observe({ remaining: 0, resetAt });

    // assert
    await expect(governor.run(execute)).rejects.toMatchObject({
      name: 'GitHubRateLimitError',
      retryAt: resetAt,
    } satisfies Partial<GitHubRateLimitError>);
    expect(execute).not.toHaveBeenCalled();
  });
});
