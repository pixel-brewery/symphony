// #region Imports
import { type ProviderConnection } from '@symphony/configuration-composition';
import { githubConnectionAccountLogin } from '../../github-connection-account/githubConnectionAccountLogin';
import { readGitHubToken } from '@symphony/providers-github';
import { type ICreateGitHubConnectionTokenReaderDependencies } from './ICreateGitHubConnectionTokenReaderDependencies';
// #endregion

/**
 * Owns githubCredentials commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createGitHubConnectionTokenReader(
  dependencies: ICreateGitHubConnectionTokenReaderDependencies,
) {
  const { settingsState } = dependencies;
  const readGitHubConnectionToken = async (
    connection: Extract<ProviderConnection, { readonly kind: 'github' }>,
  ): Promise<string | undefined> => {
    const accountLogin = githubConnectionAccountLogin(settingsState.current, connection);
    return readGitHubToken(connection.hostname, accountLogin);
  };

  return Object.freeze({ readGitHubConnectionToken });
}
