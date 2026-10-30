// #region Imports

import type { AgentCapability } from './AgentCapability';

// #endregion

/** Declarative provider metadata; credentials and runtime health never belong here. */
export interface IProviderCapabilityManifest {
  id: string;
  workspaceId: string;
  providerId: string;
  displayName: string;
  runtime: 'codex' | 'claude' | 'opencode' | 'openai-compatible-gateway';
  protocol: 'cli' | 'openai-compatible';
  capabilities: readonly AgentCapability[];
  modelDiscovery: 'runtime' | 'configured';
  officialApi: boolean;
}
