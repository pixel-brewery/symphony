export type ProviderConnection =
  | {
      id: string;
      workspaceId: string;
      kind: 'azure-devops';
      displayName: string;
      organization: string;
      tenantId?: string;
      credentialRef?: string;
    }
  | {
      id: string;
      workspaceId: string;
      kind: 'github';
      displayName: string;
      hostname: string;
      accountLogin?: string;
      gitProtocol: 'https' | 'ssh';
      credentialRef?: string;
    }
  | {
      id: string;
      workspaceId: string;
      kind: 'codex';
      displayName: string;
      credentialSource: 'user-home' | 'isolated';
      credentialRef?: string;
    }
  | {
      id: string;
      workspaceId: string;
      kind: 'claude';
      displayName: string;
      credentialSource: 'isolated';
      credentialRef?: string;
    }
  | {
      id: string;
      workspaceId: string;
      kind: 'opencode';
      displayName: string;
      credentialRef?: string;
      /** Optional OpenAI-compatible gateway exposed to OpenCode as one workspace provider. */
      gateway?: {
        providerId: string;
        displayName: string;
        baseUrl: string;
        protocol: 'openai-compatible';
      };
    };
