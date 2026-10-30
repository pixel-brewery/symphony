/**
 * Provider-neutral connection availability and account status exposed by desktop composition.
 *
 * @public
 */
export interface IProviderConnectionStatus {
  readonly github: {
    cliAvailable: boolean;
    accounts: readonly {
      id: string;
      hostname: string;
      login: string;
      active: boolean;
      gitProtocol?: 'https' | 'ssh';
      scopes: readonly string[];
    }[];
    error?: string;
  };
  readonly codex: {
    cliAvailable: boolean;
    version?: string;
    accounts: readonly {
      id: string;
      displayName: string;
      authenticated: boolean;
      method?: 'chatgpt' | 'api-key' | 'unknown';
      error?: string;
    }[];
    error?: string;
  };
  readonly claude: {
    cliAvailable: boolean;
    version?: string;
    accounts: readonly {
      id: string;
      displayName: string;
      authenticated: boolean;
      method?: 'subscription' | 'api-key' | 'unknown';
      error?: string;
    }[];
    error?: string;
  };
}
