/**
 * Projects the existing runtime and developer-tool readiness without provider implementation types.
 *
 * @public
 */
export interface IRuntimeHealth {
  status: 'starting' | 'ready' | 'degraded';
  utilityProcess: boolean;
  database: boolean;
  homebrew: { available: boolean; version?: string };
  git: { available: boolean; version?: string };
  githubCli: { available: boolean; version?: string };
  agents: {
    codex: { available: boolean; version?: string };
    claude: { available: boolean; version?: string };
    opencode: { available: boolean; version?: string };
  };
}
