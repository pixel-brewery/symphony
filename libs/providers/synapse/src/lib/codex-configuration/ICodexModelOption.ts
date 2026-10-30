export interface ICodexModelOption {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly isDefault: boolean;
  readonly defaultReasoningEffort: string;
  readonly reasoningEfforts: readonly {
    readonly id: string;
    readonly description: string;
  }[];
}
