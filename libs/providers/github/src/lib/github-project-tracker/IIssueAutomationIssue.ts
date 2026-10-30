export interface IIssueAutomationIssue {
  readonly title?: string;
  readonly body?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly lastEditedAt?: string | null;
  readonly author?: { readonly login?: string } | null;
  readonly userContentEdits?: {
    readonly nodes?: readonly {
      readonly editedAt?: string;
      readonly editor?: { readonly login?: string } | null;
    }[];
  };
}
