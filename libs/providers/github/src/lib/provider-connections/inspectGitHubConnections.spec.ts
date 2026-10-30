// #region Imports

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectGitHubConnections } from './inspectGitHubConnections';

// #endregion

const commands = vi.hoisted(() => ({ inspect: vi.fn(), run: vi.fn() }));

vi.mock('@symphony/providers-core', () => ({ inspectAllowedCommand: commands.inspect }));
vi.mock('./runAllowedCommand', () => ({ runAllowedCommand: commands.run }));

describe('inspectGitHubConnections', () => {
  beforeEach(() => {
    commands.inspect.mockReset();
    commands.run.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('does not invoke any AI CLI when inspecting GitHub availability', async () => {
    // arrange
    commands.inspect.mockResolvedValue({ available: false });

    // act
    const result = await inspectGitHubConnections();

    // assert
    expect(result).toEqual({ cliAvailable: false, accounts: [] });
    expect(commands.inspect.mock.calls).toEqual([['gh']]);
    expect(commands.run).not.toHaveBeenCalled();
  });

  it('preserves authenticated GitHub accounts and scopes through the separate inspection path', async () => {
    // arrange
    commands.inspect.mockResolvedValue({ available: true });
    commands.run.mockResolvedValue({
      stdout: JSON.stringify({
        hosts: {
          'github.example': [
            {
              state: 'success',
              login: 'synthetic-user',
              active: true,
              gitProtocol: 'https',
              scopes: 'repo, read:org',
            },
          ],
        },
      }),
    });

    // act
    const result = await inspectGitHubConnections();

    // assert
    expect(result.accounts).toEqual([
      {
        id: 'github:github.example:synthetic-user',
        hostname: 'github.example',
        login: 'synthetic-user',
        active: true,
        gitProtocol: 'https',
        scopes: ['repo', 'read:org'],
      },
    ]);
    expect(commands.inspect.mock.calls).toEqual([['gh']]);
    expect(commands.run).toHaveBeenCalledWith('gh', ['auth', 'status', '--json', 'hosts']);
  });
});
