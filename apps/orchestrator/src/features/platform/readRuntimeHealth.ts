// #region Imports
import { inspectAllowedCommand } from '@symphony/providers-core';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type IRuntimeHealth } from '@symphony/domain-platform';
// #endregion

/**
 * Inspects the configured command requirements through the existing host probes.
 *
 * @public
 */
export async function readRuntimeHealth(
  settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>,
  utilityProcess: boolean,
): Promise<IRuntimeHealth> {
  const [homebrew, git, githubCli, codex, claude, opencode] = await Promise.all([
    inspectAllowedCommand('brew'),
    inspectAllowedCommand('git'),
    inspectAllowedCommand('gh'),
    inspectAllowedCommand('codex'),
    inspectAllowedCommand('claude'),
    inspectAllowedCommand('opencode'),
  ]);
  const requiredAgentKinds = new Set(
    settingsState.current.agentRoutePolicies.flatMap((policy) =>
      policy.candidates.flatMap((routeCandidate) => {
        const connection = settingsState.current.connections.find(
          (candidate) => candidate.id === routeCandidate.aiConnectionId,
        );
        return connection?.kind === 'codex' ||
          connection?.kind === 'claude' ||
          connection?.kind === 'opencode'
          ? [connection.kind]
          : [];
      }),
    ),
  );
  const agentsReady = [...requiredAgentKinds].every((kind) => {
    switch (kind) {
      case 'claude':
        return claude.available;
      case 'opencode':
        return opencode.available;
      case 'codex':
        return codex.available;
    }
  });
  const githubCliRequired = settingsState.current.connections.some(
    (connection) => connection.kind === 'github',
  );
  return {
    status:
      git.available && agentsReady && (!githubCliRequired || githubCli.available)
        ? 'ready'
        : 'degraded',
    utilityProcess: utilityProcess,
    database: true,
    homebrew,
    git,
    githubCli,
    agents: { codex, claude, opencode },
  };
}
